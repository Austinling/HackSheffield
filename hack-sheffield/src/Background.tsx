import { useState, useEffect, useRef } from "react";

export function Background() {
  const [message, setMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<
    Array<{ id: number; text: string; sender: "me" | "server" | "user" }>
  >([]);
  const nextId = useRef(1);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // scroll to bottom whenever messages change
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Already connected");
      return;
    }

    try {
      const ws = new WebSocket(
        "wss://unperishable-autogenous-jaycob.ngrok-free.dev/ws"
      );

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnectionStatus("connected");
      };

      ws.onmessage = (event) => {
        let text =
          typeof event.data === "string"
            ? event.data
            : JSON.stringify(event.data);
        let sender: "server" | "user" = "user";

        // try to parse JSON messages that include sender metadata
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object") {
            if (parsed.text) text = String(parsed.text);
            if (parsed.sender === "server" || parsed.sender === "user") {
              sender = parsed.sender;
            }
          }
        } catch (e) {
          // not JSON, keep text as-is and treat as user message
        }

        console.log("Message received:", text, "sender:", sender);
        setMessages((prev) => [
          ...prev,
          { id: nextId.current++, text, sender },
        ]);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("error");
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionStatus("disconnected");
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setConnectionStatus("error");
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setConnectionStatus("disconnected");
      console.log("WebSocket manually disconnected");
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message) return;

    // add to local chat immediately
    const localText = message;
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, text: localText, sender: "me" },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(localText);
        console.log("Message sent:", localText);
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    } else {
      console.warn(
        "WebSocket is not connected. Current state:",
        wsRef.current?.readyState
      );
    }

    setMessage("");
  };

  return (
    <div className="flex justify-center items-center bg-linear-to-r from-[#809DF2] to-[#FFFFFF] w-full h-screen p-4">
      <div className="rounded-3xl h-full w-full max-w-3xl mx-auto flex flex-col max-h-screen overflow-hidden">
        <div className="flex justify-between items-center bg-black h-20 text-white px-6">
          <img className="h-20" src="Images/odyssey_boat.png"></img>
          <div className="font-semibold">Odyssey Chat</div>
          <div className="text-sm">
            Status:{" "}
            <span
              className={
                connectionStatus === "connected"
                  ? "text-green-400"
                  : connectionStatus === "error"
                  ? "text-red-400"
                  : "text-gray-400"
              }
            >
              {connectionStatus}
            </span>
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="bg-white flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-2 max-w-[70%] wrap-break-word ${
                  m.sender === "me"
                    ? "bg-blue-600 text-white rounded-lg rounded-tr-none"
                    : m.sender === "server"
                    ? "bg-emerald-500 text-white rounded-lg rounded-bl-none"
                    : "bg-gray-200 text-gray-900 rounded-lg rounded-bl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-linear-to-r from-blue-400 to-blue-200 p-4 text-black shrink-0"
        >
          <label htmlFor="inputBox" className="sr-only"></label>
          <input
            id="inputBox"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-6 py-4 text-lg rounded-full border-2 border-blue-500 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-300 shadow-lg transition-all duration-300 placeholder-gray-500"
            aria-label="Message input"
          />
          <button
            type="submit"
            className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg transition-colors duration-300"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
