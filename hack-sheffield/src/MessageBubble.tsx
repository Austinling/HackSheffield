export function MessageBubble({ message }) {
  const isMe = message.sender === "me";

  return (
    <div
      className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-1`}
    >
      {message.username && (
        <span
          className={`text-xs px-4 font-semibold ${
            isMe ? "text-blue-700" : "text-gray-600"
          }`}
        >
          {message.username}{" "}
          {message.targetPersona ? (
            <span className="text-xs text-gray-500">
              → {message.targetPersona}
            </span>
          ) : null}
        </span>
      )}

      <div
        className={`px-4 py-2 max-w-[70%] rounded-lg ${
          isMe
            ? "bg-blue-600 text-white"
            : message.sender === "server"
            ? "bg-emerald-500 text-white"
            : "bg-gray-200 text-gray-900"
        } ${message.loading ? "animate-pulse opacity-80" : ""}`}
      >
        {message.loading ? "..." : message.text}
      </div>
    </div>
  );
}
