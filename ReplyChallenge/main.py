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
from ReplyChallenge.database.service import log_chat_to_db, verify_database_connection

# Load env vars from ReplyChallenge/.env
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

app = FastAPI()

# --- Connection Manager for Multiplayer ---
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

# Initialize OpenAI client (optional)
# We gracefully handle missing API keys to support dev/test environments
api_key = os.getenv("OPENAI_API_KEY")
try:
    client = OpenAI(api_key=api_key) if api_key else None
    if client:
        print("✓ OpenAI client initialized")
    else:
        print("⚠ OpenAI API key not found - AI responses will not be available")
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
    # Connect user to the multiplayer room
    await manager.connect(websocket)
    
    # Hardcode Session ID for Shared History (Hackathon Logic)
    session_id = "hackathon_public_room"
    
    print(f"\n🔗 New Multiplayer Connection. Total Users: {len(manager.active_connections)}")

    # Track connected clients for join/typing events
    if not hasattr(app.state, "connected_clients"):
        app.state.connected_clients = {}

    try:
        while True:
            # Receive user input
            data = await websocket.receive_text()
            print(f"📥 User Input: {data[:100]}...")
            
            # Try to parse as JSON for structured messages (join, typing)
            parsed = None
            try:
                parsed = json.loads(data)
            except Exception:
                parsed = None

            # Handle join/typing events explicitly (these are NOT AI prompts)
            if parsed and isinstance(parsed, dict):
                msg_type = parsed.get("type")
                
                # Handle join event
                if msg_type == "join":
                    username = parsed.get("username")
                    app.state.connected_clients[websocket] = username
                    print(f"→ Registered websocket as user: {username}")
                    
                    # Notify other users that someone joined
                    payload = json.dumps({"type": "user.joined", "username": username})
                    for ws in list(app.state.connected_clients.keys()):
                        if ws is not websocket:
                            try:
                                await ws.send_text(payload)
                            except Exception:
                                pass
                    continue

                # Handle typing event - broadcast to other clients
                if msg_type == "typing":
                    is_typing = bool(parsed.get("isTyping"))
                    username = parsed.get("username")
                    payload = json.dumps({"type": "typing", "username": username, "isTyping": is_typing})
                    for ws in list(app.state.connected_clients.keys()):
                        if ws is not websocket:
                            try:
                                await ws.send_text(payload)
                            except Exception:
                                pass
                    continue

            # If not a special event, broadcast the user message so everyone sees it
            if not (parsed and isinstance(parsed, dict) and parsed.get("type")):
                await manager.broadcast(f"User: {data}")

            # Handle AI request if client is available
            if not client:
                error_msg = "OpenAI client not initialized"
                print(f"✗ {error_msg}")
                response_payload = {"sender": "system", "text": error_msg}
                try:
                    await websocket.send_text(json.dumps(response_payload))
                except Exception:
                    await websocket.send_text(error_msg)
                continue
            
            try:
                # Call OpenAI API with the user's message
                print(f"🤖 Calling OpenAI API...")
                
                # Use chat.completions API (standard endpoint)
                completion = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a code developer agent"},
                        {"role": "user", "content": data}
                    ],
                    max_tokens=500
                )
                
                answer = completion.choices[0].message.content
                tokens = completion.usage.total_tokens if completion.usage else None

                # Send back structured response
                response_payload = {"sender": "ai", "text": answer}
                try:
                    await websocket.send_text(json.dumps(response_payload))
                except Exception:
                    await websocket.send_text(answer)

                print(f"✓ OpenAI Response received ({tokens} tokens)")

                # Save to Supabase (background thread)
                print(f"💾 Saving to database...")
                loop = __import__('asyncio').get_event_loop()
                await loop.run_in_executor(
                    executor,
                    log_chat_to_db,
                    data,
                    answer,
                    tokens,
                    session_id,
                    {}
                )

                # Broadcast AI response to all users
                print(f"📤 Broadcasting response ({len(answer)} chars)")
                await manager.broadcast(f"AI: {answer}")

            except Exception as e:
                error_msg = f"Error processing request: {str(e)}"
                print(f"✗ {error_msg}")
                await manager.broadcast(f"System Error: {error_msg}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Remove from connected clients
        username = app.state.connected_clients.pop(websocket, None) if hasattr(app.state, 'connected_clients') else None
        print(f"🔌 Client disconnected. Remaining: {len(manager.active_connections)}")
        
        # Notify others that a user left
        if username:
            payload = json.dumps({"type": "user.left", "username": username})
            for ws in list(app.state.connected_clients.keys()):
                try:
                    await ws.send_text(payload)
                except Exception:
                    pass
    
    except Exception as e:
        print(f"✗ WebSocket Error: {e}")
        manager.disconnect(websocket)