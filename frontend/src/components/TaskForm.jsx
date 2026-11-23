import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '../services/api';
import { sanitizeInput } from '../utils/sanitize';

const TaskForm = ({ onSuccess, onCancel, defaultProjectId }) => {
    const [formParams, setFormParams] = useState({ 
        title: '', 
        description: '', 
        due_date: '', 
        priority: 'medium', 
        project_id: defaultProjectId || '' 
    });
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [options, setOptions] = useState({ users: [], projects: [] });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [pRes, uRes] = await Promise.all([
                    api.get('/projects'),
                    api.get('/users')
                ]);
                const projectList = pRes.data.data || [];
                const userList = uRes.data.data || [];

                setOptions({ projects: projectList, users: userList });
                if (projectList.length > 0 && !defaultProjectId) {
                    setFormParams(prev => ({ ...prev, project_id: projectList[0].id }));
                }
            } catch (error) {
                console.error("Gagal memuat opsi form:", error);
            }
        };
        fetchOptions();
    }, [defaultProjectId]);

    const handleAssigneeToggle = (userId) => {
        setSelectedAssignees(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const cleanTitle = sanitizeInput(formParams.title);
        const cleanDescription = sanitizeInput(formParams.description);

        if (!cleanTitle) {
            return toast.error("Judul tugas tidak boleh kosong!");
        }
        if (dayjs(formParams.due_date).isBefore(dayjs().startOf('day'))) {
            return toast.error("Tanggal tenggat waktu tidak boleh di masa lalu!");
        }

        setIsSaving(true);
        try {
            await api.post('/tasks', { 
                ...formParams, 
                title: cleanTitle,
                description: cleanDescription,
                assignees: selectedAssignees 
            });
            toast.success("Tugas berhasil dibuat!");
            if (onSuccess) onSuccess();
        } catch {
            // Error otomatis ditangani dan ditampilkan sebagai toast oleh Axios Interceptor
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">JUDUL TUGAS *</label>
                <input 
                    type="text" 
                    value={formParams.title} 
                    onChange={e => setFormParams({...formParams, title: e.target.value})} 
                    required 
                    className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm" 
                    placeholder="Masukkan judul..." 
                />
            </div>

            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">DESKRIPSI TUGAS</label>
                <textarea 
                    rows="3"
                    value={formParams.description} 
                    onChange={e => setFormParams({...formParams, description: e.target.value})} 
                    className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm" 
                    placeholder="Masukkan detail instruksi tugas..." 
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">PROJECT *</label>
                <select 
                    value={formParams.project_id} 
                    onChange={e => setFormParams({...formParams, project_id: e.target.value})} 
                    required 
                    disabled={!!defaultProjectId}
                    className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm cursor-pointer disabled:opacity-60"
                >
                    {options.projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">DUE DATE (MIN. HARI INI) *</label>
                <input 
                    type="date" 
                    min={dayjs().format('YYYY-MM-DD')} 
                    value={formParams.due_date} 
                    onChange={e => setFormParams({...formParams, due_date: e.target.value})} 
                    required 
                    className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm cursor-pointer" 
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">PRIORITAS</label>
                <select 
                    value={formParams.priority} 
                    onChange={e => setFormParams({...formParams, priority: e.target.value})} 
                    className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm cursor-pointer"
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">ASSIGN STAFF (MULTI-SELECT)</label>
                <div className="bg-[#f0f4fd] p-3 rounded-xl max-h-32 overflow-y-auto space-y-2">
                    {options.users.map(u => (
                        <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={selectedAssignees.includes(u.id)} 
                                onChange={() => handleAssigneeToggle(u.id)} 
                                className="rounded text-[#362765]"
                            />
                            {u.name}
                        </label>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                        Batal
                    </button>
                )}
                <button type="submit" disabled={isSaving} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all text-sm disabled:opacity-50">
                    {isSaving ? 'Menyimpan...' : 'Simpan Tugas'}
                </button>
            </div>
        </form>
    );
};

export default TaskForm;