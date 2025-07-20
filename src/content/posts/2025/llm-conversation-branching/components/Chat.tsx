interface Message {
  id: string;
  parent_id?: string;
  prompt: string;
  response: string;
}

interface ChatProps {
  messages: Message[];
  selectedId: string;
  setSelectedId: (id: string) => void;
}

export default function Chat({
  messages,
  selectedId,
  setSelectedId,
}: ChatProps) {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className="flex flex-col gap-2"
          onClick={() => setSelectedId(message.id)}
        >
          <div className="flex justify-end">
            <div className="bg-[var(--color-ink-light)] text-[var(--color-bg)] rounded-2xl rounded-br-none px-4 py-1 max-w-[80%] cursor-pointer text-sm">
              {message.prompt}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-[var(--color-bg-code)] text-[var(--color-ink)] rounded-2xl rounded-bl-none px-4 py-1 max-w-[80%] cursor-pointer text-sm">
              {message.response}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
