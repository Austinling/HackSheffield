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
load_dotenv()

app = FastAPI()

# --- Persona instruction map -------------------------------------------------
# Map persona IDs used by the frontend to distinct behaviour/instructions
# These are used as system instructions when calling the model.
PERSONA_INSTRUCTIONS = {
    "Zeus": (
        "You are Zeus — an intelligent coding assistant. Give helpful, complete answers, "
        "and when in doubt ask a clarifying technical question. Keep explanations clear."
    ),
    "Athena": (
        "You are Athena — a friendly general assistant. Provide carefully reasoned, thorough, and "
        "easy-to-understand explanations. Use examples and concise citations when helpful."
    ),
    "Hermes": (
        "You are Hermes — a fast, concise project management assistant who answers briefly and directly. Keep replies short "
        "and prioritize speed and clarity (one- or two-sentence answers)."
    ),
}
# default instruction falls back to a helpful general-purpose assistant
DEFAULT_PERSONA_INSTRUCTION = (
    "You are a helpful assistant. Tailor your response to be clear and friendly."
)
# ----------------------------------------------------------------------------

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
    await manager.connect(websocket)
    
    # Generate a Session ID for this specific connection
    session_id = str(uuid.uuid4())
    print(f"\n🔗 New WebSocket Connection: {session_id}")

    # Track connected clients so we can broadcast typing/join events
    # mapping websocket -> username (filled when the client sends a 'join')
    if not hasattr(app.state, "connected_clients"):
        app.state.connected_clients = {}

    try:
        while True:
            # 3. Receive User Input
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
                # Inform only the requesting client so others aren't spammed
                await websocket.send_text(json.dumps({"sender": "server", "text": error_msg}))
                continue
            
            try:
                # 2. Only call OpenAI when the message explicitly targets an AI
                # persona (frontend provides `targetPersona` for @mentions).
                prompt = ""
                if parsed and isinstance(parsed, dict) and parsed.get("text"):
                    # Skip AI calls when no meaningful targetPersona is present.
                    # frontend may send the sentinel "Rogue" for plain storage — treat
                    # that as non-AI as well.
                    tp_val = parsed.get("targetPersona")
                    if not tp_val or str(tp_val).lower() == "rogue":
                        print("↪ Received non-targeted message — handling non-targeted payload")
                        # If frontend wants this stored/broadcast, persist and broadcast
                        if parsed.get("store"):
                            try:
                                username = parsed.get("username") or "WebUser"
                                text = parsed.get("text") or ""
                                persona = parsed.get("persona") or "Rogue"

                                # Broadcast the user.message to other clients
                                payload_obj = {
                                    "type": "user.message",
                                    "username": username,
                                    "text": text,
                                    "persona": persona,
                                }
                                try:
                                    payload = json.dumps(payload_obj)
                                except Exception:
                                    payload = str(payload_obj)

                                # Diagnostic logging to help trace why clients might not
                                # receive user messages in some environments.
                                try:
                                    keys = list(app.state.connected_clients.items())
                                    print(f"💬 Broadcasting user.message -> active_clients={len(keys)} | session={session_id}")
                                    for ws, uname in keys:
                                        print(f"   -> client username={uname} ws_same_as_sender={ws is websocket}")
                                except Exception as _:
                                    print("⚠️  Could not enumerate connected clients for diagnostics")

                                for ws in list(app.state.connected_clients.keys()):
                                    try:
                                        await ws.send_text(payload)
                                    except Exception as e:
                                        print(f"✗ Failed delivering user.message to a client: {e}")

                                # Persist the user message into DB (non-AI message)
                                loop = __import__('asyncio').get_event_loop()
                                meta = {"source": "user.message", "target_persona": persona}
                                await loop.run_in_executor(
                                    executor,
                                    log_chat_to_db,
                                    text,
                                    "",
                                    None,
                                    session_id,
                                    meta,
                                    username,
                                    persona
                                )
                            except Exception as e:
                                print(f"✗ Failed to store/broadcast non-targeted message: {e}")
                        continue

                    # Valid targeted AI request — extract prompt
                    prompt = parsed.get("text")
                    print(f"→ AI request received: user={parsed.get('username')} target={parsed.get('targetPersona')} prompt_len={len(str(prompt))}")

                    # Broadcast the original user prompt to other clients so everyone
                    # sees the message that triggered the AI (but avoid re-echoing
                    # to the origin since the sender adds a local echo for mentions).
                    try:
                        user_payload = json.dumps({
                            "type": "user.message",
                            "username": parsed.get("username"),
                            "text": prompt,
                            "targetPersona": persona_id,
                        })
                        for ws in list(app.state.connected_clients.keys()):
                            if ws is not websocket:
                                try:
                                    await ws.send_text(user_payload)
                                except Exception:
                                    pass
                    except Exception as _:
                        print("⚠️ Unable to broadcast original user prompt to other clients")
                    if not str(prompt).strip():
                        # Inform client that the prompt is empty
                        await websocket.send_text(json.dumps({"sender": "server", "text": "Error: Empty prompt for AI. Please include a message after the @persona."}))
                        continue
                else:
                    # raw data (no JSON) — treat as non-AI call
                    print("↪ Received non-JSON text — skipping AI call")
                    continue

                # Choose persona-specific instructions (only allow real personas)
                persona_id = parsed.get("targetPersona") or parsed.get("persona")
                # Accept case-insensitive persona names and map to the canonical key
                canonical_persona = None
                if isinstance(persona_id, str):
                    lower = persona_id.lower()
                    for key in PERSONA_INSTRUCTIONS.keys():
                        if key.lower() == lower:
                            canonical_persona = key
                            break

                if not canonical_persona:
                    print(f"↪ Unknown persona '{persona_id}' — skipping AI call")
                    continue

                persona_id = canonical_persona
                instruction_text = PERSONA_INSTRUCTIONS.get(persona_id, DEFAULT_PERSONA_INSTRUCTION)

                response = client.responses.create(
                    model="gpt-4o",
                    instructions=instruction_text,
                    input=prompt,
                )

                # Response parsing: keep backward-compatible 'output_text' or fall back
                answer = getattr(response, "output_text", None)
                if answer is None:
                    # newer SDKs may include `response.output_text` or nested objects
                    answer = str(response)

                # Send back a structured JSON payload so the front-end can identify server messages
                # Include persona metadata in the response so frontend can render the responder
                response_payload = {
                    "sender": "server",
                    "text": answer,
                    "targetPersona": persona_id,
                }
                # Broadcast AI responses to all connected clients so everyone sees
                # the model reply, not just the requester.
                try:
                    payload = json.dumps(response_payload)
                except Exception:
                    payload = answer

                for ws in list(app.state.connected_clients.keys()):
                    try:
                        await ws.send_text(payload)
                    except Exception:
                        pass

                tokens = getattr(response.usage, "total_tokens", None)
                
                print(f"✓ OpenAI Response received ({tokens} tokens)")

                # 3. Save to Supabase (using thread pool for blocking operation)
                # Ensure we persist the user prompt and embed persona into metadata
                print(f"💾 Saving to database...")
                loop = __import__('asyncio').get_event_loop()
                # Prepare metadata from response and ensure persona is recorded
                try:
                    response_meta = getattr(response, "model_dump", lambda: {})() or {}
                except Exception:
                    response_meta = {"_response_meta_error": True}

                # Attach persona to metadata so DB won't require a top-level column
                if isinstance(response_meta, dict):
                    response_meta.setdefault("target_persona", persona_id)
                else:
                    response_meta = {"target_persona": persona_id}

                # Use the parsed prompt as the user_prompt (not the raw JSON string)
                user_prompt_text = prompt if isinstance(prompt, str) else str(prompt)

                await loop.run_in_executor(
                    executor,
                    log_chat_to_db,
                    user_prompt_text,
                    answer,
                    tokens,
                    session_id,
                    response_meta,
                    parsed.get("username", "WebUser"),
                    persona_id
                )

                # 4. Log response to console for observability
                try:
                    print(f"📤 Sending response ({len(answer)} chars)")
                except Exception:
                    print("📤 Sending response (unknown length)")

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
        manager.disconnect(websocket)