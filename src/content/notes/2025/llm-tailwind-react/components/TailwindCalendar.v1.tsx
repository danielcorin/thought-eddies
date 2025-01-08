import { Calendar as CalendarIcon, Circle, CheckCircle2, Square, XCircle } from 'lucide-react'
import { useState } from 'react'

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
            case 'todo': return <Circle className="w-5 h-5 text-gray-600" />
            case 'done': return <CheckCircle2 className="w-5 h-5 text-green-600" />
            case 'migrated': return <Square className="w-5 h-5 text-blue-600" />
            case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />
        }
    }

    const currentEntry = entries.find(entry =>
        entry.date.toDateString() === selectedDate.toDateString()
    )

    return (
        <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-8">
                <CalendarIcon className="w-6 h-6 text-gray-600" />
                <h1 className="text-2xl font-semibold">Bullet Journal</h1>
            </div>

            <div className="mb-8">
                <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={e => setSelectedDate(new Date(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex gap-4 mb-8">
                <input
                    type="text"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    placeholder="Add new task..."
                    onKeyPress={e => e.key === 'Enter' && addTask()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={addTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Add
                </button>
            </div>

            <div className="space-y-2">
                {currentEntry?.tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md">
                        <button
                            onClick={() => {
                                const nextStatus: Record<Task['status'], Task['status']> = {
                                    todo: 'done',
                                    done: 'migrated',
                                    migrated: 'cancelled',
                                    cancelled: 'todo'
                                }
                                updateTaskStatus(task.id, nextStatus[task.status])
                            }}
                            className="focus:outline-none"
                        >
                            {getStatusIcon(task.status)}
                        </button>
                        <span className={task.status === 'done' ? 'line-through text-gray-500' : ''}>
                            {task.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
