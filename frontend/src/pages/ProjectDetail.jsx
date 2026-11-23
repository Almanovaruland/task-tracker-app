import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus } from 'lucide-react';
import api from '../services/api';
import TaskForm from '../components/TaskForm';

const ProjectDetail = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [showForm, setShowForm] = useState(false);

    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { role: 'staff' };
    const isManager = user.role === 'manager';

    const fetchProjectDetails = async () => {
        try {
            const [pRes, tRes] = await Promise.all([
                api.get(`/projects/${id}`),
                api.get('/tasks', { params: { project_id: id } })
            ]);
            setProject(pRes.data.data);
            setTasks(tRes.data.data || []);
        } catch (error) {
            toast.error("Gagal memuat rincian project");
        }
    };

    useEffect(() => { fetchProjectDetails(); }, [id]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#362765]">
                <ArrowLeft size={16} /> Kembali ke Dashboard
            </Link>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{project?.name || 'Project Detail'}</h1>
                    <p className="text-sm text-gray-400 mt-1">{project?.description || 'Tidak ada deskripsi'}</p>
                </div>
                {isManager && (
                    <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#362765] hover:bg-[#251a4a] text-white font-bold py-2.5 px-5 rounded-xl shadow-md text-sm">
                        <Plus size={18} /> Tambah Task
                    </button>
                )}
            </div>

            {isManager && showForm && (
                <TaskForm 
                    defaultProjectId={id} 
                    onSuccess={() => { setShowForm(false); fetchProjectDetails(); }} 
                    onCancel={() => setShowForm(false)} 
                />
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Daftar Tugas Project Ini</h3>
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div key={task.id} className="p-4 bg-[#f0f4fd] rounded-xl flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-800">{task.title}</p>
                                <p className="text-xs text-gray-400">Assignee: {task.assignee_names || 'Unassigned'} | Due: {dayjs(task.due_date).format('DD MMM YYYY')}</p>
                            </div>
                            <span className="capitalize px-3 py-1 bg-white rounded-lg text-xs font-bold text-[#362765]">
                                {task.status?.replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                    {tasks.length === 0 && <p className="text-sm text-gray-400 italic">Belum ada tugas di project ini.</p>}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;