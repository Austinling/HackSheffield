import { useState, useEffect, useRef } from "react";

export function useWebSocket(currentUsername: string, persona: string = "Zeus", shouldConnect: boolean = true) {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const nextId = useRef(1);

  const connect = () => {
    if (!shouldConnect || !currentUsername) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(
      "wss://unperishable-autogenous-jaycob.ngrok-free.dev/ws"
    );

    ws.onopen = () => {
      setConnectionStatus("connected");
      // Announce this user joining the chat
      ws.send(JSON.stringify({ type: "join", username: currentUsername }));
    };

    ws.onerror = () => setConnectionStatus("error");
    ws.onclose = () => setConnectionStatus("disconnected");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : "{}");

        // Handle typing indicator
        if (data.type === "typing") {
          setTypingUsers((prev) => {
            const updated = new Set(prev);
            if (data.isTyping) {
              updated.add(data.username);
            } else {
              updated.delete(data.username);
            }
            return updated;
          });
          return;
        }

        // Handle broadcasted user message (from other users or server response)
        if (data.type === "message" || (data.text && data.username)) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId.current++,
              sender: data.sender || "user",
              text: data.text,
              username: data.username,
              targetPersona: data.targetPersona,
              error: data.error,
            },
          ]);
          // Clear typing indicator for this user
          setTypingUsers((prev) => {
            const updated = new Set(prev);
            updated.delete(data.username);
            return updated;
          });
          return;
        }

        // Ignore plain text fallback messages (welcome, system messages, etc.)
        // Only process structured JSON messages with username or type field
        return;
      } catch (err) {
        // Ignore plain text messages that can't be parsed as JSON
        return;
      }
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
    
    // Match @PersonaName anywhere in the message (at start, end, or middle)
    const mentionMatch = text.match(/@([A-Za-z0-9_-]+)/);
    
    // Extract the content (everything except the @persona mention)
    const getContentWithoutMention = (fullText: string, personaName: string) => {
      return fullText.replace(`@${personaName}`, "").trim();
    };

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
          username: currentUsername,
        },
        { id: nextId.current++, text: "...", sender: "server", loading: true },
      ]);

      const payload = {
        action: "ai_to_ai",
        fromPersona,
        toPersona,
        text: inner,
        username: currentUsername,
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
      const content = getContentWithoutMention(text, targetPersona);

      // local echo with target info
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          text: content || `(calling ${targetPersona})`,
          sender: "me",
          username: currentUsername,
          targetPersona,
        },
        { id: nextId.current++, text: "...", sender: "server", loading: true },
      ]);

      const payload = {
        text: content || "",
        username: currentUsername,
        persona,
        targetPersona,
      };
      
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("WebSocket not connected. State:", wsRef.current?.readyState);
        return;
      }
      
      try {
        wsRef.current.send(JSON.stringify(payload));
      } catch (err) {
        console.error("Failed to send websocket message:", err);
      }
      return;
    }

    // default: show locally only (no broadcast, no AI call)
    // Only messages with @persona are sent to the server
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, text, sender: "me", username: currentUsername },
    ]);
  };

  useEffect(() => {
    if (shouldConnect && currentUsername) {
      connect();
    }
    return () => wsRef.current?.close();
  }, [currentUsername, shouldConnect]);

  const sendTypingIndicator = (isTyping: boolean) => {
    try {
      wsRef.current?.send(JSON.stringify({
        type: "typing",
        username: currentUsername,
        isTyping,
      }));
    } catch (err) {
      console.error("Failed to send typing indicator:", err);
    }
  };

  return { connectionStatus, messages, typingUsers, sendMessage, sendTypingIndicator };
}
