
import os
import uuid
from typing import Union
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# Import your custom database functions
from ReplyChallenge.database.service import log_chat_to_db, verify_database_connection

# Load env vars
load_dotenv()

app = FastAPI()

# Initialize OpenAI client
try:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file")
    client = OpenAI(api_key=api_key)
    print("✓ OpenAI client initialized")
except Exception as e:
    print(f"✗ OpenAI initialization failed: {e}")
    client = None

# Initialize thread pool for blocking DB operations
executor = ThreadPoolExecutor(max_workers=5)

# Enable CORS
origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Verify database connection on startup"""
    print("\n" + "="*50)
    print("APPLICATION STARTUP")
    print("="*50)
    try:
        verify_database_connection()
    except Exception as e:
        print(f"⚠ Warning: Database verification failed on startup: {e}")
    print("="*50 + "\n")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Generate a Session ID for this specific connection
    session_id = str(uuid.uuid4())
    print(f"\n🔗 New WebSocket Connection: {session_id}")

    try:
        while True:
            # 1. Receive User Input
            data = await websocket.receive_text()
            print(f"📥 User Input: {data[:100]}...")
            
            if not client:
                error_msg = "OpenAI client not initialized"
                print(f"✗ {error_msg}")
                await websocket.send_text(f"Error: {error_msg}")
                continue
            
            try:
                # 2. Call OpenAI API
                print(f"🤖 Calling OpenAI API...")
                completion = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": data}]
                )
                
                ai_text = completion.choices[0].message.content
                tokens = completion.usage.total_tokens
                full_metadata = completion.model_dump()
                
                print(f"✓ OpenAI Response received ({tokens} tokens)")

                # 3. Save to Supabase (using thread pool for blocking operation)
                print(f"💾 Saving to database...")
                loop = __import__('asyncio').get_event_loop()
                await loop.run_in_executor(
                    executor,
                    log_chat_to_db,
                    data,
                    ai_text,
                    tokens,
                    session_id,
                    full_metadata
                )

                # 4. Send Response back to WebSocket
                print(f"📤 Sending response ({len(ai_text)} chars)")
                await websocket.send_text(ai_text)

            except Exception as e:
                error_msg = f"Error processing request: {str(e)}"
                print(f"✗ {error_msg}")
                await websocket.send_text(f"Error: {error_msg}")

    except WebSocketDisconnect:
        print(f"🔌 Client disconnected: {session_id}")
    except Exception as e:
        print(f"✗ WebSocket Error: {e}")
        try:
            await websocket.close()
        except:
            pass
