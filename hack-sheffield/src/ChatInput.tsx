import React, { useState, useRef, useEffect } from "react";

export function ChatInput({ message, setMessage, onSend, suggestions = [] }: any) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // watch for @mention pattern — show suggestions even when only '@' is typed
  useEffect(() => {
    const match = message.match(/@([A-Za-z0-9_-]*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      let list: string[];
      if (!q) {
        // show full list when user typed only '@'
        list = suggestions.slice();
      } else {
        // suggestions now can be objects with id field
        list = suggestions.filter((s: any) => (s.id || s).toString().toLowerCase().startsWith(q));
      }
      setFiltered(list as any[]);
      setActiveIndex(0);
      setOpen(list.length > 0);
    } else {
      setOpen(false);
    }
  }, [message, suggestions]);

  const insertSuggestion = (item: any) => {
    const name = item.id || item;
    // replace the trailing @token (including when token is empty) with the full mention + space
    const newText = message.replace(/@([A-Za-z0-9_-]*)$/, `@${name} `);
    setMessage(newText);
    
    setOpen(false);
    // Keep focus in the input and move caret to the end of the inserted text
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = newText.length;
        try {
          inputRef.current.setSelectionRange(len, len);
        } catch (e) {
          // ignore if unable to set selection
        }
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const sel = filtered[activeIndex];
      if (sel) insertSuggestion(sel);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <form
      ref={containerRef}
      onSubmit={(e) => {
        e.preventDefault();
        onSend(message);
        setMessage("");
      }}
      className="relative flex items-center gap-2 bg-linear-to-r from-blue-400 to-blue-200 p-4"
    >
      <input
        className="flex-1 px-6 py-4 text-lg rounded-full border-2 border-blue-500"
        placeholder="Ask me anything... (use @name)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        ref={inputRef}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
      />

      {open && (
        <div className="absolute left-6 bottom-16 bg-white rounded shadow-lg w-80 z-40">
          {filtered.map((s: any, idx: number) => (
            <div
              key={(s.id || s).toString() + idx}
              onMouseDown={(ev) => {
                // mouseDown to prevent blur before click
                ev.preventDefault();
                insertSuggestion(s);
              }}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${idx === activeIndex ? 'bg-blue-100' : ''}`}
            >
              {s.image ? (
                <img src={s.image} alt={s.id || s} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">@</div>
              )}
              <div className="flex flex-col">
                <div className="font-medium">{s.id || s}</div>
                {s.desc && <div className="text-xs text-gray-500">{s.desc}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="px-6 py-4 bg-blue-600 text-white rounded-full">Send</button>
    </form>
  );
}
