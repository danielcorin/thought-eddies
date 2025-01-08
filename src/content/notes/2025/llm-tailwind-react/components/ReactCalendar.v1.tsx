import { Calendar as CalendarIcon, Circle, CheckCircle2, Square, XCircle } from 'lucide-react'
import { useState } from 'react'
import styles from './ReactCalendar.v1.module.css'

type Task = {
    id: string
    text: string
    status: 'todo' | 'done' | 'migrated' | 'cancelled'
}

type DayEntry = {
    date: Date
    tasks: Task[]
}

export default function Calendar() {
    const [entries, setEntries] = useState<DayEntry[]>([])
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [newTask, setNewTask] = useState('')

    const addTask = () => {
        if (!newTask.trim()) return

        setEntries(prev => {
            const existingEntry = prev.find(entry =>
                entry.date.toDateString() === selectedDate.toDateString()
            )

            if (existingEntry) {
                return prev.map(entry =>
                    entry.date.toDateString() === selectedDate.toDateString()
                        ? {
                            ...entry,
                            tasks: [...entry.tasks, {
                                id: crypto.randomUUID(),
                                text: newTask,
                                status: 'todo'
                            }]
                        }
                        : entry
                )
            }

            return [...prev, {
                date: selectedDate,
                tasks: [{
                    id: crypto.randomUUID(),
                    text: newTask,
                    status: 'todo'
                }]
            }]
        })

        setNewTask('')
    }

    const updateTaskStatus = (taskId: string, status: Task['status']) => {
        setEntries(prev =>
            prev.map(entry => ({
                ...entry,
                tasks: entry.tasks.map(task =>
                    task.id === taskId ? { ...task, status } : task
                )
            }))
        )
    }

    const getStatusIcon = (status: Task['status']) => {
        switch (status) {
            case 'todo': return <Circle className={styles.icon} />
            case 'done': return <CheckCircle2 className={styles.icon} />
            case 'migrated': return <Square className={styles.icon} />
            case 'cancelled': return <XCircle className={styles.icon} />
        }
    }

    const currentEntry = entries.find(entry =>
        entry.date.toDateString() === selectedDate.toDateString()
    )

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <CalendarIcon className={styles.calendarIcon} />
                <h1>Bullet Journal</h1>
            </div>

            <div className={styles.dateSelector}>
                <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={e => setSelectedDate(new Date(e.target.value))}
                />
            </div>

            <div className={styles.taskInput}>
                <input
                    type="text"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    placeholder="Add new task..."
                    onKeyPress={e => e.key === 'Enter' && addTask()}
                />
                <button onClick={addTask}>Add</button>
            </div>

            <div className={styles.taskList}>
                {currentEntry?.tasks.map(task => (
                    <div key={task.id} className={styles.task}>
                        <button
                            className={styles.statusButton}
                            onClick={() => {
                                const nextStatus: Record<Task['status'], Task['status']> = {
                                    todo: 'done',
                                    done: 'migrated',
                                    migrated: 'cancelled',
                                    cancelled: 'todo'
                                }
                                updateTaskStatus(task.id, nextStatus[task.status])
                            }}
                        >
                            {getStatusIcon(task.status)}
                        </button>
                        <span className={task.status === 'done' ? styles.completed : ''}>
                            {task.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
