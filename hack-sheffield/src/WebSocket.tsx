import { useState, useEffect, useRef } from "react";

export function useWebSocket(currentUser: string, persona: string | null = null) {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const nextId = useRef(1);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(
      "wss://unperishable-autogenous-jaycob.ngrok-free.dev/ws"
      // "wss://helene-drivable-appetizingly.ngrok-free.dev/ws"
    );

    ws.onopen = () => setConnectionStatus("connected");
    ws.onerror = () => setConnectionStatus("error");
    ws.onclose = () => setConnectionStatus("disconnected");

    ws.onmessage = (event) => {
      // Parse incoming data (may be JSON with metadata or plain text)
      let text = typeof event.data === "string" ? event.data : "";
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          // Prefer common field names for server text
          if (parsed.text) text = String(parsed.text);
          else if (parsed.message) text = String(parsed.message);
          else if (typeof parsed === "string") text = parsed;
        }
      } catch (e) {
        // JSON.parse failed — server might send a partial/invalid object string
        // Try a defensive regex to pull out the text field: "text": "..."
        try {
          const m = /"text"\s*:\s*"([^"]*)"/.exec(text);
          if (m && m[1]) {
            text = m[1];
          }
        } catch (err) {
          // ignore any regex failures and keep raw text
        }
      }

      // Prefer to replace the most recent loading indicator instead of appending
      setMessages((prev) => {
        // find last index of a loading message
        let idx = -1;
        for (let i = prev.length - 1; i >= 0; --i) {
          if (prev[i] && prev[i].loading) {
            idx = i;
            break;
          }
        }

        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], text, loading: false };
          return copy;
        }

        // no loading placeholder found — append as a new server message
        return [
          ...prev,
          {
            id: nextId.current++,
            sender: "server",
            text,
          },
        ];
      });
    };

    wsRef.current = ws;
  };

  const sendMessage = (rawText: string) => {
    const text = String(rawText || "").trim();
    if (!text) return;

    const mentionMatch = text.match(/^@([A-Za-z0-9_-]+)\s+(.+)$/);

    if (mentionMatch) {
      const targetPersona = mentionMatch[1];
      const content = mentionMatch[2];

      // local echo with target info
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          text: content,
          sender: "me",
          username: currentUser,
          targetPersona,
        },
        { id: nextId.current++, text: "...", sender: "server", loading: true },
      ]);

      const payload = {
        text: content,
        username: currentUser,
        persona,
        targetPersona,
      };
      try {
        wsRef.current?.send(JSON.stringify(payload));
      } catch (err) {
        console.error("Failed to send websocket message:", err);
      }
      return;
    }

    // default: send from current persona
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, text, sender: "me", username: currentUser },
      { id: nextId.current++, text: "...", sender: "server", loading: true },
    ]);

    const payload = { text, username: currentUser, persona };
    
    try {
      wsRef.current?.send(JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to send websocket message:", err);
    }
  };

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, []);

  return { connectionStatus, messages, sendMessage };
}
