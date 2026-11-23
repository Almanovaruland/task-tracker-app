import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react';
import api from '../services/api';
import { initiateSocketConnection } from '../services/socket';
import { CardSkeleton, ErrorState } from '../components/UXStates';

const TaskDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [task, setTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { id: 0, role: 'staff' };
    const isManager = user.role === 'manager';

    let assigneeIds = [];
    if (task?.assignee_ids) {
        if (Array.isArray(task.assignee_ids)) {
            assigneeIds = task.assignee_ids.map(Number);
        } else {
            assigneeIds = String(task.assignee_ids).split(',').map(aid => Number(aid.trim()));
        }
    }

    const isAssignee = assigneeIds.includes(Number(user.id));
    const canChangeStatus = isManager || isAssignee;

    // 1. Bungkus dengan useCallback agar aman dimasukkan ke dalam useEffect
    const fetchTaskDetail = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/tasks/${id}`);
            setTask(res.data.data);
        } catch {
            setError("Gagal memuat rincian task. Periksa koneksi Anda.");
        } finally {
            setIsLoading(false);
        }
    }, [id]); // id menjadi dependency di sini

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchTaskDetail();

        const socket = initiateSocketConnection();

        const handleTaskUpdate = (payload) => {
            console.log("Socket task:updated diterima:", payload);
            const updatedTask = payload.data || payload; 
            
            if (String(updatedTask.id) === String(id)) {
                setTask(prevTask => ({ ...prevTask, ...updatedTask }));
                toast.success("Status diperbarui secara live oleh sistem!", { id: 'socket-toast' });
            }
        };

        socket.on('task:updated', handleTaskUpdate);

        return () => {
            socket.off('task:updated', handleTaskUpdate);
        };
    }, [id, fetchTaskDetail]);

    const handleStatusChange = async (newStatus) => {
        const previousStatus = task.status; 
        
        // Optimistic Update: UI berubah duluan tanpa nunggu server
        setTask(prev => ({ ...prev, status: newStatus }));

        try {
            await api.put(`/tasks/${id}/status`, { status: newStatus });
            // Tidak perlu memanggil toast sukses di sini karena socket sudah memunculkannya
        } catch (error) {
            // Rollback UI jika API ternyata gagal
            setTask(prev => ({ ...prev, status: previousStatus }));
            toast.error(error.response?.data?.message || "Koneksi terputus. Status dikembalikan.");
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="w-48 h-6 bg-gray-200 rounded animate-pulse mb-6"></div>
                <CardSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto pt-10">
                <ErrorState message={error} onRetry={fetchTaskDetail} />
            </div>
        );
    }

    if (!task) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button 
                onClick={() => navigate('/tasks')} 
                className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#362765] cursor-pointer transition-colors"
            >
                <ArrowLeft size={16} /> Kembali ke Daftar Task
            </button>

            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                        <span className="px-3 py-1 bg-[#f0f4fd] text-[#362765] text-xs font-bold rounded-lg uppercase">
                            {task.project_name || 'Project Utama'}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-3">{task.title}</h1>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase self-start ${
                        task.priority === 'high' ? 'bg-pink-100 text-pink-600' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                    }`}>
                        Priority: {task.priority}
                    </span>
                </div>

                <div className="text-gray-600 text-sm bg-gray-50 p-4 sm:p-5 rounded-2xl">
                    <p className="font-semibold text-gray-700 mb-2">Deskripsi Tugas:</p>
                    <p className="leading-relaxed">{task.description || 'Tidak ada deskripsi yang dilampirkan.'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3 bg-[#f0f4fd] p-4 rounded-2xl">
                        <Clock className="text-[#362765] shrink-0" size={20} />
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase">Tenggat Waktu</p>
                            <p className="font-bold text-gray-800">{dayjs(task.due_date).format('DD MMM YYYY')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-[#f0f4fd] p-4 rounded-2xl">
                        <UserCheck className="text-[#362765] shrink-0" size={20} />
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase">Assignee(s)</p>
                            <p className="font-bold text-gray-800">{task.assignee_names || 'Belum ada assignee'}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-5">
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Status Saat Ini</p>
                        <div className="flex items-center gap-2 font-bold text-lg text-[#362765] capitalize">
                            <CheckCircle2 size={20} className="text-green-500" />
                            {task.status?.replace('_', ' ')}
                        </div>
                    </div>

                    {canChangeStatus ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                            <span className="text-xs font-bold text-gray-500">Ubah Status:</span>
                            <select 
                                value={task.status} 
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="bg-[#f0f4fd] font-bold text-[#362765] px-4 py-3 sm:py-2.5 rounded-xl border-none outline-none text-sm cursor-pointer w-full sm:w-auto hover:bg-[#e4ebfa] transition-colors"
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-start sm:items-center gap-2 text-xs text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
                            <AlertCircle size={16} className="shrink-0 mt-0.5 sm:mt-0" />
                            <span className="leading-snug">Anda tidak memiliki hak akses mengubah status task ini.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskDetail;