import os
import uuid
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Import your custom database functions
# (Preserving your specific import structure)
from ReplyChallenge.database.service import log_chat_to_db, verify_database_connection

# Load env vars from ReplyChallenge/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

app = FastAPI()

# --- 1. NEW: Connection Manager for Multiplayer ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # Send the message to every open tab
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting to a client: {e}")

# Initialize the manager
manager = ConnectionManager()
# --------------------------------------------------

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
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return JSONResponse({
        "status": "running",
        "message": "ReplyChallenge API is live (Multiplayer Mode)",
        "endpoints": {
            "websocket": "ws://localhost:8000/ws",
            "health": "/health"
        }
    })

@app.get("/health")
async def health():
    """Health check endpoint"""
    return JSONResponse({
        "status": "healthy",
        "database": "connected",
        "openai": "initialized" if client else "not initialized",
        "active_users": len(manager.active_connections)
    })

@app.on_event("startup")
async def startup_event():
    """Verify database connection on startup"""
    print("\n" + "="*50)
    print("APPLICATION STARTUP (MULTIPLAYER MODE)")
    print("="*50)
    try:
        verify_database_connection()
    except Exception as e:
        print(f"⚠ Warning: Database verification failed on startup: {e}")
    print("="*50 + "\n")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 1. Connect user to the "Room" instead of just accepting
    await manager.connect(websocket)
    
    # 2. Hardcode Session ID for Shared History (Hackathon Logic)
    # Using a single ID means all users contribute to the same chat history
    session_id = "hackathon_public_room"
    
    print(f"\n🔗 New Multiplayer Connection. Total Users: {len(manager.active_connections)}")

    try:
        while True:
            # 3. Receive User Input
            data = await websocket.receive_text()
            print(f"📥 User Input: {data[:100]}...")
            
            # 4. BROADCAST USER MESSAGE (So everyone sees what was typed)
            # You might want to prefix this with "User:" or handle UI bubbles on frontend
            await manager.broadcast(f"User: {data}")

            if not client:
                error_msg = "OpenAI client not initialized"
                print(f"✗ {error_msg}")
                await manager.broadcast(f"System: {error_msg}")
                continue
            
            try:
                # 5. Call OpenAI API
                print(f"🤖 Calling OpenAI API...")
                completion = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": data}]
                )
                
                ai_text = completion.choices[0].message.content
                tokens = completion.usage.total_tokens
                full_metadata = completion.model_dump()
                
                print(f"✓ OpenAI Response received ({tokens} tokens)")

                # 6. Save to Supabase (Background Thread)
                # We save it once. Since session_id is shared, it's saved for the whole room.
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

                # 7. BROADCAST AI RESPONSE (So everyone sees the answer)
                print(f"📤 Broadcasting response ({len(ai_text)} chars)")
                await manager.broadcast(f"AI: {ai_text}")

            except Exception as e:
                error_msg = f"Error processing request: {str(e)}"
                print(f"✗ {error_msg}")
                await manager.broadcast(f"System Error: {error_msg}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"🔌 Client disconnected. Remaining: {len(manager.active_connections)}")
    except Exception as e:
        print(f"✗ WebSocket Error: {e}")
        manager.disconnect(websocket)