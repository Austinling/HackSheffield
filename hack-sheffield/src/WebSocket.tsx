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

    const ws = new WebSocket(
      "wss://unperishable-autogenous-jaycob.ngrok-free.dev/ws"
      // "wss://helene-drivable-appetizingly.ngrok-free.dev/ws"
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
      let text = typeof event.data === "string" ? event.data : "";
      let parsedMsg: any = null;
      try {
        parsedMsg = JSON.parse(text);
        if (parsedMsg && typeof parsedMsg === "object") {
          // handle structured control messages first
          if (parsedMsg.type === "typing") {
            const username = parsedMsg.username;
            const isTyping = !!parsedMsg.isTyping;
            setTypingUsers((prev) => {
              const copy = new Set(prev);
              if (isTyping) copy.add(username);
              else copy.delete(username);
              return copy;
            });
            return; // don't add to messages
          }

          if (parsedMsg.type === "user.joined" || parsedMsg.type === "user.left") {
            // show a small system message for joins/leaves
            const notice = parsedMsg.type === "user.joined" ? `${parsedMsg.username} joined` : `${parsedMsg.username} left`;
            setMessages((prev) => [
              ...prev,
              { id: nextId.current++, text: notice, sender: "server" },
            ]);
            // ensure typing state is cleared when someone leaves
            if (parsedMsg.type === "user.left" && parsedMsg.username) {
              setTypingUsers((prev) => {
                const copy = new Set(prev);
                copy.delete(parsedMsg.username);
                return copy;
              });
            }
            return;
          }

          // Prefer common field names for server text
          if (parsedMsg.text) text = String(parsedMsg.text);
          else if (parsedMsg.message) text = String(parsedMsg.message);
          else if (typeof parsedMsg === "string") text = parsedMsg;
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
