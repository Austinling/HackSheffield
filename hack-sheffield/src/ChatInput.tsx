export function ChatInput({ message, setMessage, onSend }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend(message);
        setMessage("");
      }}
      className="flex items-center gap-2 bg-linear-to-r from-blue-400 to-blue-200 p-4"
    >
      <input
        className="flex-1 px-6 py-4 text-lg rounded-full border-2 border-blue-500"
        placeholder="Ask me anything..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button className="px-6 py-4 bg-blue-600 text-white rounded-full">
        Send
      </button>
    </form>
  );
}
