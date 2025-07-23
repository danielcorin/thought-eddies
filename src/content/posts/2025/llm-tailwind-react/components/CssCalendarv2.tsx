import { CheckCircle2, Circle, Square, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

type Task = {
  id: string;
  text: string;
  status: 'todo' | 'done' | 'migrated' | 'cancelled';
  date: string;
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '90ch',
    margin: '0 auto',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    '@media (min-width: 640px)': {
      padding: '2rem',
    },
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center' as const,
    fontSize: '1.25rem',
    fontWeight: 'bold',
    '@media (min-width: 640px)': {
      fontSize: '1.5rem',
    },
  },
  taskInput: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    marginBottom: '2rem',
    '@media (min-width: 640px)': {
      gap: '1rem',
    },
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  button: {
    padding: '0.5rem 1rem',
    background: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    '@media (min-width: 640px)': {
      width: 'auto',
    },
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    marginBottom: '2rem',
  },
  task: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    border: '1px solid #eee',
    borderRadius: '4px',
    wordBreak: 'break-word' as const,
  },
  statusButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  calendar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    padding: '0.5rem',
    '@media (min-width: 640px)': {
      gap: '4px',
      padding: '1rem',
    },
  },
  calendarDay: {
    padding: '0.25rem',
    border: '1px solid #eee',
    borderRadius: '4px',
    minHeight: '60px',
    cursor: 'pointer',
    '@media (min-width: 640px)': {
      padding: '0.5rem',
      minHeight: '80px',
    },
  },
  dayHeader: {
    fontSize: '0.75rem',
    marginBottom: '0.25rem',
    color: '#666',
    '@media (min-width: 640px)': {
      fontSize: '0.875rem',
      marginBottom: '0.5rem',
    },
  },
  stats: {
    fontSize: '0.625rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    '@media (min-width: 640px)': {
      fontSize: '0.75rem',
      gap: '2px',
    },
  },
};

export default function Calendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const addTask = () => {
    if (!newTask.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: newTask,
        status: 'todo',
        date: selectedDate,
      },
    ]);
    setNewTask('');
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status } : task))
    );
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return (
          <Circle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#666' }} />
        );
      case 'done':
        return (
          <CheckCircle2
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: '#22c55e' }}
          />
        );
      case 'migrated':
        return (
          <Square
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: '#3b82f6' }}
          />
        );
      case 'cancelled':
        return (
          <XCircle
            className="w-4 h-4 sm:w-5 sm:h-5"
            style={{ color: '#ef4444' }}
          />
        );
    }
  };

  const calendarDays = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const days = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  }, []);

  const getTaskStats = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayTasks = tasks.filter((t) => t.date === dateStr);

    return {
      todo: dayTasks.filter((t) => t.status === 'todo').length,
      done: dayTasks.filter((t) => t.status === 'done').length,
      migrated: dayTasks.filter((t) => t.status === 'migrated').length,
      cancelled: dayTasks.filter((t) => t.status === 'cancelled').length,
    };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Bullet Journal</div>

      <div style={styles.taskInput}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add new task..."
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
          style={styles.input}
        />
        <button onClick={addTask} style={styles.button}>
          Add
        </button>
      </div>

      <div style={styles.taskList}>
        {tasks
          .filter((task) => task.date === selectedDate)
          .map((task) => (
            <div key={task.id} style={styles.task}>
              <button
                onClick={() => {
                  const nextStatus: Record<Task['status'], Task['status']> = {
                    todo: 'done',
                    done: 'migrated',
                    migrated: 'cancelled',
                    cancelled: 'todo',
                  };
                  updateTaskStatus(task.id, nextStatus[task.status]);
                }}
                style={styles.statusButton}
              >
                {getStatusIcon(task.status)}
              </button>
              <span
                style={
                  task.status === 'done'
                    ? { textDecoration: 'line-through', color: '#999' }
                    : {}
                }
              >
                {task.text}
              </span>
            </div>
          ))}
      </div>

      <div style={styles.calendar}>
        {calendarDays.map((day) => {
          const stats = getTaskStats(day);
          return (
            <div
              key={day.toISOString()}
              style={{
                ...styles.calendarDay,
                backgroundColor:
                  day.toISOString().split('T')[0] === selectedDate
                    ? '#f0f0f0'
                    : 'white',
              }}
              onClick={() => setSelectedDate(day.toISOString().split('T')[0])}
            >
              <div style={styles.dayHeader}>{day.getDate()}</div>
              <div style={styles.stats}>
                {stats.todo > 0 && (
                  <div style={{ color: '#666' }}>○ {stats.todo}</div>
                )}
                {stats.done > 0 && (
                  <div style={{ color: '#22c55e' }}>✓ {stats.done}</div>
                )}
                {stats.migrated > 0 && (
                  <div style={{ color: '#3b82f6' }}>□ {stats.migrated}</div>
                )}
                {stats.cancelled > 0 && (
                  <div style={{ color: '#ef4444' }}>× {stats.cancelled}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
