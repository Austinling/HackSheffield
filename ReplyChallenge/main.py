
import os
import uuid
import json
from typing import Union
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# Import your custom database functions
from ReplyChallenge.database.service import log_chat_to_db, verify_database_connection

app = FastAPI()

load_dotenv()
# Initialize OpenAI client (optional)
# We purposely avoid hard-raising here so the app can start in environments
# where the key is intentionally omitted (tests, local dev without OpenAI, etc.).
# The websocket handler will return a helpful error for requests that need the
# OpenAI client.
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

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

    # Track connected clients so we can broadcast typing/join events
    # mapping websocket -> username (filled when the client sends a 'join')
    if not hasattr(app.state, "connected_clients"):
        app.state.connected_clients = {}

    try:
        while True:
            # 1. Receive User Input
            data = await websocket.receive_text()
            print(f"📥 User Input: {data}...")

            # try to parse JSON so we can handle structured messages
            parsed = None
            try:
                parsed = json.loads(data)
            except Exception:
                parsed = None

            # Handle join/typing events explicitly (these are NOT AI prompts)
            if parsed and isinstance(parsed, dict) and parsed.get("type") in ("join", "typing"):
                t = parsed.get("type")
                username = parsed.get("username")

                # Register username on join
                if t == "join":
                    app.state.connected_clients[websocket] = username
                    print(f"→ Registered websocket as user: {username}")

                    # Optionally notify other users that someone joined (non-AI message)
                    payload = json.dumps({"type": "user.joined", "username": username})
                    for ws in list(app.state.connected_clients.keys()):
                        if ws is not websocket:
                            try:
                                await ws.send_text(payload)
                            except Exception:
                                pass

                    # nothing more to do for join
                    continue

                # typing event: broadcast to other clients (do not call OpenAI or DB)
                if t == "typing":
                    is_typing = bool(parsed.get("isTyping"))
                    username = parsed.get("username")
                    payload = json.dumps({"type": "typing", "username": username, "isTyping": is_typing})
                    for ws in list(app.state.connected_clients.keys()):
                        if ws is not websocket:
                            try:
                                await ws.send_text(payload)
                            except Exception:
                                pass
                    # do not call OpenAI / DB for typing events
                    continue

            # continued: actual prompt handling
            if not client:
                error_msg = "OpenAI client not initialized"
                print(f"✗ {error_msg}")
                # Send a JSON message so the front-end can render this as a server message
                await websocket.send_text(json.dumps({"sender": "server", "text": error_msg}))
                continue
            
            try:
                # 2. Only call OpenAI when the message explicitly targets an AI
                # persona (frontend provides `targetPersona` for @mentions).
                prompt = ""
                if parsed and isinstance(parsed, dict) and parsed.get("text"):
                    # Skip AI calls when no targetPersona is present
                    if not parsed.get("targetPersona"):
                        print("↪ Received non-targeted message — skipping AI call")
                        continue
                    prompt = parsed.get("text")
                else:
                    # raw data (no JSON) — treat as non-AI call
                    print("↪ Received non-JSON text — skipping AI call")
                    continue

                response = client.responses.create(
                    model="gpt-4o",
                    instructions="You are a code developer agent",
                    input=prompt
                )

                # Response parsing: keep backward-compatible 'output_text' or fall back
                answer = getattr(response, "output_text", None)
                if answer is None:
                    # newer SDKs may include `response.output_text` or nested objects
                    answer = str(response)

                # Send back a structured JSON payload so the front-end can identify server messages
                response_payload = {"sender": "server", "text": answer}
                try:
                    await websocket.send_text(json.dumps(response_payload))
                except Exception:
                    # Fallback to raw text if JSON serialization fails
                    await websocket.send_text(answer)

                tokens = getattr(response.usage, "total_tokens", None)
                
                print(f"✓ OpenAI Response received ({tokens} tokens)")

                # # 3. Save to Supabase (using thread pool for blocking operation)
                # print(f"💾 Saving to database...")
                # loop = __import__('asyncio').get_event_loop()
                # await loop.run_in_executor(
                #     executor,
                #     log_chat_to_db,
                #     data,
                #     answer,
                #     tokens,
                #     session_id,
                #     getattr(response, "model_dump", lambda: {})()
                # )

                # 4. Log response to console for observability
                # try:
                #     print(f"📤 Sending response ({len(answer)} chars)")
                # except Exception:
                #     print("📤 Sending response (unknown length)")

            except Exception as e:
                error_msg = f"Error processing request: {str(e)}"
                print(f"✗ {error_msg}")
                await websocket.send_text(f"Error: {error_msg}")

    except WebSocketDisconnect:
        # remove from connected clients if present
        username = app.state.connected_clients.pop(websocket, None) if hasattr(app.state, 'connected_clients') else None
        print(f"🔌 Client disconnected: {session_id} (user={username})")
        # notify others that a user left
        if username:
            payload = json.dumps({"type": "user.left", "username": username})
            for ws in list(app.state.connected_clients.keys()):
                try:
                    await ws.send_text(payload)
                except Exception:
                    pass
    except Exception as e:
        print(f"✗ WebSocket Error: {e}")
        try:
            await websocket.close()
        except:
            pass
