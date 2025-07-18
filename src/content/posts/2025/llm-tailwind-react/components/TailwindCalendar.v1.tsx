import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Square,
  XCircle,
} from "lucide-react";
import { useState } from "react";

type Task = {
  id: string;
  text: string;
  status: "todo" | "done" | "migrated" | "cancelled";
};

type DayEntry = {
  date: Date;
  tasks: Task[];
};

export default function Calendar() {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    if (!newTask.trim()) return;

    setEntries((prev) => {
      const existingEntry = prev.find(
        (entry) => entry.date.toDateString() === selectedDate.toDateString(),
      );

      if (existingEntry) {
        return prev.map((entry) =>
          entry.date.toDateString() === selectedDate.toDateString()
            ? {
              ...entry,
              tasks: [
                ...entry.tasks,
                {
                  id: crypto.randomUUID(),
                  text: newTask,
                  status: "todo",
                },
              ],
            }
            : entry,
        );
      }

      return [
        ...prev,
        {
          date: selectedDate,
          tasks: [
            {
              id: crypto.randomUUID(),
              text: newTask,
              status: "todo",
            },
          ],
        },
      ];
    });

    setNewTask("");
  };

  const updateTaskStatus = (taskId: string, status: Task["status"]) => {
    setEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        tasks: entry.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task,
        ),
      })),
    );
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
      case "done":
        return (
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
        );
      case "migrated":
        return <Square className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />;
    }
  };

  const currentEntry = entries.find(
    (entry) => entry.date.toDateString() === selectedDate.toDateString(),
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-8 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-8">
        <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-600">Bullet Journal</h1>
      </div>

      <div className="mb-4 sm:mb-8">
        <input
          type="date"
          value={selectedDate.toISOString().split("T")[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-8">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add new task..."
          onKeyPress={(e) => e.key === "Enter" && addTask()}
          className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTask}
          className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {currentEntry?.tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 p-2 border border-gray-200 rounded-md"
          >
            <button
              onClick={() => {
                const nextStatus: Record<Task["status"], Task["status"]> = {
                  todo: "done",
                  done: "migrated",
                  migrated: "cancelled",
                  cancelled: "todo",
                };
                updateTaskStatus(task.id, nextStatus[task.status]);
              }}
              className="focus:outline-none"
            >
              {getStatusIcon(task.status)}
            </button>
            <span
              className={`text-sm sm:text-base ${task.status === "done" ? "line-through text-gray-500" : ""}`}
            >
              {task.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
