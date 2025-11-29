import { useState, useRef } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList.tsx";
import { ChatInput } from "./ChatInput";
import { useWebSocket } from "./WebSocket";

export function Background() {
  const [currentUser, setCurrentUser] = useState("User1");
  const [currentPersona, setCurrentPersona] = useState("Description");
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [message, setMessage] = useState("");
  const messagesContainerRef = useRef(null);
  const userList = ["User1", "User2", "User3"];

  const personas = [
    {
      id: "Zeus",
      name: "Zeus — General AI",
      desc: "General assistant with broad knowledge",
      image: "Images/zeus.jpeg",
    },
    {
      id: "Athena",
      name: "Athena — Researcher",
      desc: "Careful, detailed explanations",
      image: "Images/athena.jpeg",
    },
    {
      id: "Hermes",
      name: "Hermes — Quick replies",
      desc: "Short, fast answers",
      image: "Images/hermes.png",
    },
  ];

  const getPersonaImage = (id: string) => {
    return personas.find((p) => p.id === id)?.image || "";
  };

  const { connectionStatus, messages, sendMessage } = useWebSocket(
    currentUser,
    currentPersona
  );

  return (
    <div className="flex justify-center items-center h-screen bg-linear-to-r from-[#809DF2] to-[#FFFFFF]">
      <div className="rounded-3xl max-w-3xl w-full h-full flex flex-col bg-blue-500">
        <ChatHeader
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          connectionStatus={connectionStatus}
          userList={userList}
          currentPersona={currentPersona}
          onOpenPersonaPicker={() => setShowPersonaPicker(true)}
          personaImage={getPersonaImage(currentPersona)}
        />

        {showPersonaPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
              <h3 className="text-2xl font-semibold text-center mb-6">
                Choose AI Persona
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentPersona(p.id);
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
        />

        <ChatInput
          message={message}
          setMessage={setMessage}
          onSend={sendMessage}
        />
      </div>
    </div>
  );
}
