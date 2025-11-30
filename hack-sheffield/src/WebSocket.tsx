import { useState, useEffect, useRef } from "react";

export function useWebSocket(
  currentUser: string,
  persona: string | null = null
) {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const nextId = useRef(1);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const rawUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
    // Ensure we use a ws/wss scheme (allow users to set http(s) too)
    const normalized = rawUrl.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    const ws = new WebSocket(
      "wss://unperishable-autogenous-jaycob.ngrok-free.dev/ws"
      //"wss://helene-drivable-appetizingly.ngrok-free.dev/ws"
    );

    ws.onopen = () => {
      setConnectionStatus("connected");
      // announce join to the server so it can track connected users
      try {
        if (currentUser) ws.send(JSON.stringify({ type: "join", username: currentUser }));
      } catch (err) {
        console.error("Failed to send join event", err);
      }
    };

    ws.onerror = () => setConnectionStatus("error");
    ws.onclose = () => setConnectionStatus("disconnected");

    ws.onmessage = (event) => {
      // Parse incoming data (may be JSON with metadata or plain text)
      let raw = typeof event.data === "string" ? event.data : "";
      let parsedMsg: any = null;
      try {
        parsedMsg = JSON.parse(raw);
      } catch (e) {
        parsedMsg = null;
      }

      // Handle typing presence quickly
      if (parsedMsg && parsedMsg.type === "typing") {
        const username = parsedMsg.username;
        const isTyping = !!parsedMsg.isTyping;
        setTypingUsers((prev) => {
          const copy = new Set(prev);
          if (isTyping) copy.add(username);
          else copy.delete(username);
          return copy;
        });
        return;
      }

      // Determine message payload fields
      let messageText = "";
      let messageSender: string | null = null;
      let messageType = "server";

      if (parsedMsg && typeof parsedMsg === "object") {
        messageType = parsedMsg.type || "server";
        if (messageType === "message") {
          messageText = String(parsedMsg.text || parsedMsg.message || "");
          messageSender = parsedMsg.username || "unknown";
        } else if (messageType === "ai") {
          messageText = String(parsedMsg.text || "");
          messageSender = "ai";
        } else if (messageType === "system") {
          messageText = String(parsedMsg.text || "");
          messageSender = "server";
        } else {
          // fallback for other structured messages
          messageText = String(parsedMsg.text || parsedMsg.message || raw);
          messageSender = parsedMsg.username || "server";
        }
      } else {
        // non-json fallback
        messageText = raw;
        messageSender = "server";
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
          copy[idx] = { ...copy[idx], text: messageText, loading: false };
          return copy;
        }

        // no loading placeholder found — append as a new message
        return [
          ...prev,
          {
            id: nextId.current++,
            sender: messageSender,
            text: messageText,
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
      const content = mentionMatch[2] || "";

      // local echo with target info
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          text: content || `(calling ${targetPersona})`,
          sender: "me",
          username: currentUser,
          targetPersona,
        },
        { id: nextId.current++, text: "...", sender: "server", loading: true },
      ]);

      const payload = {
        text: content || "",
        username: currentUser,
        persona,
        targetPersona,
      };

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error(
          "WebSocket not connected. State:",
          wsRef.current?.readyState
        );
        return;
      }

      try {
        wsRef.current.send(JSON.stringify(payload));
      } catch (err) {
        console.error("Failed to send websocket message:", err);
      }
      return;
    }

    // default: show locally only. AI calls should only be sent to server when
    // the message is explicitly targeted via a mention (@persona or @Name).
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, text, sender: "me", username: currentUser },
    ]);

    const payload = { text, username: currentUser, persona };

    try {
      wsRef.current?.send(JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to send websocket message:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      connect();

      // If the socket is already open (reconnecting or switched users), ensure
      // we explicitly identify/join so the backend maps websocket -> username.
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "join", username: currentUser }));
        }
      } catch (err) {
        // ignore send errors here; onopen handler will also send join
      }
    }
    return () => wsRef.current?.close();
  }, [currentUser]);

  const sendTypingIndicator = (isTyping: boolean) => {
    // Send typing presence to the backend so other connected clients can
    // be notified. The backend will rebroadcast to other clients and will
    // not forward typing events to OpenAI or DB.
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({ type: "typing", username: currentUser, isTyping }));
    } catch (err) {
      console.error("Failed to send typing indicator:", err);
    }
  };

  return {
    connectionStatus,
    messages,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
  };
}
