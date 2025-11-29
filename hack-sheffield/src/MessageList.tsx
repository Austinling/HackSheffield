import { MessageBubble } from "./MessageBubble";

export function MessageList({ messages, messagesContainerRef }) {
  return (
    <div
      ref={messagesContainerRef}
      className="bg-blue-500 flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((msg: unknown) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
