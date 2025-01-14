import { Circle, CheckCircle2, Square, XCircle } from 'lucide-react'
import { useState } from 'react'

type Task = {
    id: string
    text: string
    status: 'todo' | 'done' | 'migrated' | 'cancelled'
}

const styles = {
    container: {
        maxWidth: '800px',
        margin: '1rem auto',
        padding: '1rem',
        width: '95%',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        '@media (min-width: 640px)': {
            margin: '2rem auto',
            padding: '2rem'
        }
    },
    header: {
        marginBottom: '2rem',
        textAlign: 'center' as const,
        fontSize: '1.25rem',
        fontWeight: 'bold',
        '@media (min-width: 640px)': {
            fontSize: '1.5rem'
        }
    },
    taskInput: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem',
        marginBottom: '2rem',
        '@media (min-width: 640px)': {
            flexDirection: 'row' as const,
            gap: '1rem'
        }
    },
    input: {
        width: '100%',
        padding: '0.5rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '1rem'
    },
    button: {
        width: '100%',
        padding: '0.5rem 1rem',
        background: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        '@media (min-width: 640px)': {
            width: 'auto'
        }
    },
    taskList: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem'
    },
    task: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem',
        border: '1px solid #eee',
        borderRadius: '4px',
        wordBreak: 'break-word' as const
    },
    statusButton: {
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0
    }
}

export default function Calendar() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState('')

    const addTask = () => {
        if (!newTask.trim()) return

        setTasks(prev => [...prev, {
            id: crypto.randomUUID(),
            text: newTask,
            status: 'todo'
        }])
        setNewTask('')
    }

    const updateTaskStatus = (taskId: string, status: Task['status']) => {
        setTasks(prev =>
            prev.map(task =>
                task.id === taskId ? { ...task, status } : task
            )
        )
    }

    const getStatusIcon = (status: Task['status']) => {
        switch (status) {
            case 'todo': return <Circle className="w-5 h-5" style={{ color: '#666' }} />
            case 'done': return <CheckCircle2 className="w-5 h-5" style={{ color: '#22c55e' }} />
            case 'migrated': return <Square className="w-5 h-5" style={{ color: '#3b82f6' }} />
            case 'cancelled': return <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
        }
    }

    return (
        <div style={styles.container}>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <div style={styles.header}>Bullet Journal</div>

            <div style={styles.taskInput}>
                <input
                    type="text"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    placeholder="Add new task..."
                    onKeyPress={e => e.key === 'Enter' && addTask()}
                    style={styles.input}
                />
                <button onClick={addTask} style={styles.button}>
                    Add
                </button>
            </div>

            <div style={styles.taskList}>
                {tasks.map(task => (
                    <div key={task.id} style={styles.task}>
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
                            style={styles.statusButton}
                        >
                            {getStatusIcon(task.status)}
                        </button>
                        <span style={task.status === 'done' ? { textDecoration: 'line-through', color: '#999' } : {}}>
                            {task.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
