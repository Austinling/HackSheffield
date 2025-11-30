import { useState, useRef } from "react";
import zeusImg from "../Images/zeus.jpeg";
import athenaImg from "../Images/athena.jpeg";
import hermesImg from "../Images/hermes.png";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList.tsx";
import { ChatInput } from "./ChatInput";
import { useWebSocket } from "./WebSocket";
import LoginPrompt from "./LoginPrompt";

export function Background() {
  const [currentUsername, setCurrentUsername] = useState("");
  const [usernameSubmitted, setUsernameSubmitted] = useState(false);
  const [currentPersona] = useState("AI Descriptions");
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [message, setMessage] = useState("");
  const messagesContainerRef = useRef(null);

  const personas = [
    {
      id: "Zeus",
      name: "Zeus — General AI",
      desc: "General assistant with broad knowledge",
      image: zeusImg,
    },
    {
      id: "Athena",
      name: "Athena — Researcher",
      desc: "Careful, detailed explanations",
      image: athenaImg,
    },
    {
      id: "Hermes",
      name: "Hermes — Quick replies",
      desc: "Short, fast answers",
      image: hermesImg,
    },
  ];

  const getPersonaImage = (id: string) => {
    return personas.find((p) => p.id === id)?.image || "";
  };

  // Only initialize WebSocket after username is submitted
  const shouldConnect = Boolean(usernameSubmitted && currentUsername.trim());
  const {
    connectionStatus,
    messages,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
  } = useWebSocket(shouldConnect ? currentUsername : "", currentPersona);

  // Show reusable LoginPrompt until the user provides a username
  if (!usernameSubmitted || !currentUsername.trim()) {
    return (
      <LoginPrompt
        username={currentUsername}
        onChange={(v) => setCurrentUsername(v)}
        onSubmit={() => setUsernameSubmitted(true)}
      />
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-linear-to-r from-[#809DF2] to-[#FFFFFF]">
      <div className="rounded-3xl max-w-3xl w-full h-full flex flex-col bg-blue-500">
        <ChatHeader
          connectionStatus={connectionStatus}
          currentPersona={currentPersona}
          onOpenPersonaPicker={() => setShowPersonaPicker(true)}
          personaImage={getPersonaImage(currentPersona)}
        />

        {showPersonaPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
              <h3 className="text-2xl font-semibold text-center mb-6">
                Description of AI Personas
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      // Close the picker without changing persona
                      setShowPersonaPicker(false);
                    }}
                    className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <img
                      src={p.image}
                      alt={p.id}
                      className="w-24 h-24 rounded-full mb-3 object-cover"
                    />
                    <div className="font-semibold text-center">{p.id}</div>
                    <div className="text-xs text-gray-600 text-center mt-1">
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowPersonaPicker(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <MessageList
          messages={messages}
          messagesContainerRef={messagesContainerRef}
          typingUsers={typingUsers}
        />

        <ChatInput
          message={message}
          setMessage={setMessage}
          onSend={sendMessage}
          onTyping={sendTypingIndicator}
          suggestions={personas}
        />
      </div>
    </div>
  );
}
