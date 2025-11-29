export function ChatHeader({
  connectionStatus,
  currentPersona,
  onOpenPersonaPicker,
  personaImage,
}: any) {
  return (
    <div className="flex justify-between items-center bg-black h-20 text-white px-6">
      <img className="h-20" src="Images/odyssey_boat.png" />
      <div className="font-semibold text-[#d3eeec]">Odyssey Chat</div>

      <div className="flex items-center gap-4">
        {/* single-user app: no user selector */}

        <button
          onClick={onOpenPersonaPicker}
          className="flex items-center gap-2 px-3 py-1 bg-gray-700 text-white rounded border border-gray-500 hover:bg-gray-600 transition"
        >
          {personaImage && (
            <img
              src={personaImage}
              alt={currentPersona}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-sm font-semibold">{currentPersona}</span>
        </button>

        <div className="text-sm">
          Status: {" "}
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
    </div>
  );
}
