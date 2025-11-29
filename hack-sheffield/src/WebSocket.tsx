import { useState, useEffect, useRef } from "react";

export function useWebSocket(currentUser: string, persona: string = "Zeus") {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const nextId = useRef(1);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(
      "wss://unperishable-autogenous-jaycob.ngrok-free.dev/ws"
    );

    ws.onopen = () => setConnectionStatus("connected");
    ws.onerror = () => setConnectionStatus("error");
    ws.onclose = () => setConnectionStatus("disconnected");

    ws.onmessage = (event) => {
      const text = typeof event.data === "string" ? event.data : "";
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          sender: "server",
          text,
        },
      ]);
    };

    wsRef.current = ws;
  };

  const sendMessage = (rawText: string) => {
    const text = String(rawText || "").trim();
    if (!text) return;

    // Detect ai->ai syntax: @From->@To: message
    const aiToAiMatch = text.match(
      /^@([A-Za-z0-9_-]+)\s*->\s*@([A-Za-z0-9_-]+)\s*:\s*(.+)$/
    );
    const mentionMatch = text.match(/^@([A-Za-z0-9_-]+)\s+(.+)$/);

    if (aiToAiMatch) {
      const fromPersona = aiToAiMatch[1];
      const toPersona = aiToAiMatch[2];
      const inner = aiToAiMatch[3];

      // show a local system message that the AI-AI convo was requested
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          text: `(Requested ${fromPersona} → ${toPersona}) ${inner}`,
          sender: "me",
          username: currentUser,
        },
        { id: nextId.current++, text: "...", sender: "server", loading: true },
      ]);

      const payload = {
        action: "ai_to_ai",
        fromPersona,
        toPersona,
        text: inner,
        username: currentUser,
      };
      try {
        wsRef.current?.send(JSON.stringify(payload));
      } catch (err) {
        console.error("Failed to send websocket message:", err);
      }
      return;
    }

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
