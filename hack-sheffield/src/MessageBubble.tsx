import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

export function MessageBubble({
  message,
}: {
  message: {
    sender: string;
    loading?: boolean;
    text?: string;
    username?: string;
    targetPersona?: string;
  };
}) {
  const isMe = message.sender === "me";

  // Render small centred system notices (join/leave) differently
  if (message.sender === "system") {
    return (
      <div className="w-full flex justify-center">
        <span className="text-xs text-gray-400 italic px-2">{message.text}</span>
      </div>
    );
  }

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
          {message.targetPersona && message.sender !== "user" ? (
            <span className="text-xs text-gray-500">
              → {message.targetPersona}
            </span>
          ) : null}
        </span>
      )}

      <div
        className={`max-w-[70%] overflow-x-auto ${
          message.loading ? "animate-pulse opacity-80" : ""
        } ${
          isMe
            ? "px-4 py-2 rounded-lg bg-blue-600 text-white"
            : message.sender === "server"
            ? "px-4 py-3 rounded-lg bg-emerald-50 text-inherit text-left"
            : "px-4 py-2 rounded-lg bg-gray-200 text-gray-900"
        }`}
      >
        {message.loading ? (
          "..."
        ) : message.sender === "server" ? (
          <div
            className="text-left whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: md.render(String(message.text || "")),
            }}
          />
        ) : (
          message.text
        )}
      </div>
    </div>
  );
}
