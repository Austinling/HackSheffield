import os
import uuid
import json
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
    # Connect user to the room and initialize per-connection state
    await manager.connect(websocket)

    # Hardcoded shared session id for hackathon room
    session_id = "hackathon_public_room"

    # Ensure a map of websocket -> username exists on app.state
    if not hasattr(app.state, "connected_clients"):
        app.state.connected_clients = {}

    print(f"\n🔗 New Multiplayer Connection. Total Users: {len(manager.active_connections)}")

    try:
        while True:
            data = await websocket.receive_text()
            print(f"📥 Received raw input: {data[:120]}...")

            # Try to parse structured JSON messages from the frontend
            parsed = None
            try:
                parsed = json.loads(data)
            except Exception:
                parsed = None

            # Handle join events: store in DB but DO NOT broadcast to chat
            if parsed and isinstance(parsed, dict) and parsed.get("type") == "join":
                username = parsed.get("username") or "anonymous"
                app.state.connected_clients[websocket] = username
                print(f"→ Registered user: {username} for websocket")

                # Persist join event to DB (background thread)
                loop = __import__("asyncio").get_event_loop()
                await loop.run_in_executor(
                    executor,
                    log_chat_to_db,
                    None,
                    None,
                    None,
                    session_id,
                    {"event": "join"},
                    username,
                    "join",
                )
                # Do not broadcast join messages to clients (user requested)
                continue

            # Handle typing presence: rebroadcast to other clients
            if parsed and isinstance(parsed, dict) and parsed.get("type") == "typing":
                username = parsed.get("username") or app.state.connected_clients.get(websocket, "anonymous")
                payload = json.dumps({"type": "typing", "username": username, "isTyping": bool(parsed.get("isTyping"))})
                # broadcast typing presence to other clients
                for ws in list(app.state.connected_clients.keys()):
                    if ws is not websocket:
                        try:
                            await ws.send_text(payload)
                        except Exception:
                            pass
                continue

            # For normal messages, expect structured payload with `text` and `username`
            username = app.state.connected_clients.get(websocket, "anonymous")
            text = None
            if parsed and isinstance(parsed, dict) and parsed.get("text"):
                text = parsed.get("text")
            else:
                # fallback: treat raw string as message text
                text = data

            # Broadcast the user message to everyone (so chat is shared)
            broadcast_payload = json.dumps({"type": "message", "username": username, "text": text})
            await manager.broadcast(broadcast_payload)

            # If OpenAI client missing, send private system notice to sender
            if not client:
                err = "OpenAI client not initialized"
                print(f"✗ {err}")
                try:
                    await websocket.send_text(json.dumps({"type": "system", "text": err}))
                except Exception:
                    pass
                # still persist the user message without AI
                loop = __import__("asyncio").get_event_loop()
                await loop.run_in_executor(
                    executor,
                    log_chat_to_db,
                    text,
                    None,
                    None,
                    session_id,
                    {},
                    username,
                    "message",
                )
                continue

            # Call OpenAI privately for this sender only
            try:
                print(f"🤖 Calling OpenAI for user={username}...")
                completion = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": text},
                    ],
                    max_tokens=500,
                )

                ai_text = completion.choices[0].message.content
                tokens = getattr(completion.usage, "total_tokens", None)
                full_metadata = getattr(completion, "model_dump", lambda: {})()

                print(f"✓ OpenAI response for {username} ({tokens} tokens)")

                # Persist both prompt and response together
                loop = __import__("asyncio").get_event_loop()
                await loop.run_in_executor(
                    executor,
                    log_chat_to_db,
                    text,
                    ai_text,
                    tokens,
                    session_id,
                    full_metadata,
                    username,
                    "message",
                )

                # Send AI response privately to the requester only
                try:
                    await websocket.send_text(json.dumps({"type": "ai", "text": ai_text}))
                except Exception:
                    await websocket.send_text(ai_text)

            except Exception as e:
                error_msg = f"Error processing request: {str(e)}"
                print(f"✗ {error_msg}")
                try:
                    await websocket.send_text(json.dumps({"type": "system", "text": error_msg}))
                except Exception:
                    pass

    except WebSocketDisconnect:
        # cleanup on disconnect
        manager.disconnect(websocket)
        username = app.state.connected_clients.pop(websocket, None) if hasattr(app.state, 'connected_clients') else None
        print(f"🔌 Client disconnected. Remaining: {len(manager.active_connections)} user={username}")
        # persist a leave event (do not broadcast)
        if username:
            loop = __import__("asyncio").get_event_loop()
            await loop.run_in_executor(
                executor,
                log_chat_to_db,
                None,
                None,
                None,
                session_id,
                {"event": "leave"},
                username,
                "leave",
            )
    except Exception as e:
        print(f"✗ WebSocket Error: {e}")
        manager.disconnect(websocket)