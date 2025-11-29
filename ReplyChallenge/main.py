from typing import Union

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS so your React app can connect
origins = [
    "http://localhost:5173",  # your React dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            data = await websocket.receive_text()
            # Echo back or handle messages
            await websocket.send_text(f"Server received: {data}")
        except Exception as e:
            print("Connection closed:", e)
            break