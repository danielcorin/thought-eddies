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
        return <Circle className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />;
      case "done":
        return (
          <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
        );
      case "migrated":
        return <Square className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />;
    }
  };

  const currentEntry = entries.find(
    (entry) => entry.date.toDateString() === selectedDate.toDateString(),
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getTaskStats = (date: Date) => {
    const entry = entries.find(
      (e) => e.date.toDateString() === date.toDateString(),
    );
    if (!entry) return null;

    const stats = {
      todo: 0,
      done: 0,
      migrated: 0,
      cancelled: 0,
    };

    entry.tasks.forEach((task) => {
      stats[task.status]++;
    });

    return stats;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8">
        <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
        <h1 className="text-xl md:text-2xl font-semibold">Bullet Journal</h1>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6 md:mb-8 text-center text-sm md:text-base">
        {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
          <div key={day} className="font-semibold py-1 md:py-2">
            {day}
          </div>
        ))}
        {getDaysInMonth(selectedDate).map((date, i) => (
          <div
            key={i}
            className={`p-1 md:p-2 min-h-[60px] md:min-h-[100px] border ${date?.toDateString() === selectedDate.toDateString() ? "border-blue-500" : "border-gray-200"} rounded-md ${date ? "cursor-pointer hover:bg-gray-50" : ""}`}
            onClick={() => date && setSelectedDate(date)}
          >
            {date && (
              <>
                <div className="text-right text-gray-600 text-xs md:text-base">
                  {date.getDate()}
                </div>
                {getTaskStats(date) && (
                  <div className="mt-1 text-[10px] md:text-xs space-y-0.5 md:space-y-1">
                    {Object.entries(getTaskStats(date)!).map(
                      ([status, count]) =>
                        count > 0 && (
                          <div
                            key={status}
                            className="flex items-center justify-between"
                          >
                            {getStatusIcon(status as Task["status"])}
                            <span>{count}</span>
                          </div>
                        ),
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-6 md:mb-8">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add new task..."
          onKeyPress={(e) => e.key === "Enter" && addTask()}
          className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTask}
          className="px-4 py-2 bg-blue-600 text-white text-sm md:text-base rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {currentEntry?.tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 p-2 border border-gray-200 rounded-md text-sm md:text-base"
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
              className={
                task.status === "done" ? "line-through text-gray-500" : ""
              }
            >
              {task.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
