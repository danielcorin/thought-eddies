import { useState } from "react";
import Chat from "./Chat";
import Tree from "./Tree";

interface Message {
  id: string;
  parent_id?: string;
  prompt: string;
  response: string;
  summary: string;
}

export default function ChatAndTree({ messages }: { messages: Message[] }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("1");
  const [activeView, setActiveView] = useState<"tree" | "chat">("tree");

  const getPathToRoot = (nodeId: string): Message[] => {
    const path: Message[] = [];
    let currentId = nodeId;

    while (currentId) {
      const message = messages.find((m) => m.id === currentId);
      if (!message) break;
      path.unshift(message);
      currentId = message.parent_id || "";
    }

    return path;
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const selectedPath = getPathToRoot(selectedNodeId);
  return (
    <div className="w-full h-full">
      <div className="grid grid-cols-2 gap-4 h-full">
        <div className="h-full">
          <Tree
            messages={messages}
            onNodeClick={handleNodeClick}
            selectedId={selectedNodeId}
            setSelectedId={setSelectedNodeId}
          />
        </div>
        <div className="h-full overflow-auto">
          <Chat
            messages={selectedPath}
            selectedId={selectedNodeId}
            setSelectedId={setSelectedNodeId}
          />
        </div>
      </div>
    </div>
  );
}
