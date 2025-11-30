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
      {/* Show a concise typing indicator in the message area */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-2 text-sm text-gray-400 italic">
          {(() => {
            const names = Array.from(typingUsers || []);
            if (names.length === 1) return `${names[0]} is typing...`;
            if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
            return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others are typing...`;
          })()}
        </div>
      )}
    </div>
  );
}
