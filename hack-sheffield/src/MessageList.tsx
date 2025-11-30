import { MessageBubble } from "./MessageBubble";

export function MessageList({
  messages,
  messagesContainerRef,
  typingUsers = new Set(),
}: any) {
  return (
    <div
      ref={messagesContainerRef}
      className="bg-blue-500 flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((msg: unknown) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {/* Show typing indicators for users currently typing */}
      {typingUsers.size > 0 && (
        <div className="space-y-2">
          {Array.from(typingUsers).map((username: any) => (
            <div key={`typing-${username}`} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 px-4 font-semibold">
                {String(username)} is typing...
              </span>
              <div className="flex gap-1 px-4 py-2 bg-gray-300 rounded-lg">
                <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
                <span
                  className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
