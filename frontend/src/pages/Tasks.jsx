import { useState, useEffect, useMemo, useCallback } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import Select from 'react-select';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Search, Plus, PlusCircle, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { TableSkeleton, EmptyState, ErrorState } from '../components/UXStates';

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [sorting, setSorting] = useState([]); 
    const limit = 10;

    const [formParams, setFormParams] = useState({ title: '', description: '', due_date: '', priority: 'medium', project_id: '' });
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [options, setOptions] = useState({ users: [], projects: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Gunakan useCallback agar bisa dimasukkan ke dependency array useEffect
    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get('/tasks', { params: { q: search, status: filterStatus, page, limit } });
            setTasks(res.data.data || []);
        } catch { 
            // Hapus parameter (err) agar tidak kena warning 'no-unused-vars'
            setError("Gagal memuat daftar tugas. Periksa koneksi Anda."); 
        } finally { 
            setIsLoading(false); 
        }
    }, [search, filterStatus, page, limit]);

    // Gunakan useCallback untuk fungsi ini juga
    const fetchOptions = useCallback(async () => {
        try {
            const [uRes, pRes] = await Promise.all([api.get('/users'), api.get('/projects')]);
            setOptions({ 
                users: uRes.data.data.map(u => ({ value: u.id, label: u.name })), 
                projects: pRes.data.data 
            });
            if (pRes.data.data.length > 0) setFormParams(prev => ({ ...prev, project_id: pRes.data.data[0].id }));
        } catch { 
            // Hapus parameter (error) agar tidak kena warning
            console.log("Gagal memuat opsi form"); 
        }
    }, []);

    useEffect(() => { 
        fetchTasks(); 
        fetchOptions(); 
    }, [fetchTasks, fetchOptions]); // Masukkan ke dependency array

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (dayjs(formParams.due_date).isBefore(dayjs().startOf('day'))) return toast.error("Tanggal tidak boleh di masa lalu!");

        setIsSaving(true);
        try {
            const assignees = selectedAssignees.map(opt => opt.value);
            await api.post('/tasks', { ...formParams, assignees });
            toast.success("Tugas berhasil dibuat!");
            setFormParams({ title: '', description: '', due_date: '', priority: 'medium', project_id: options.projects[0]?.id || '' });
            setSelectedAssignees([]);
            setShowForm(false);
            fetchTasks();
        } catch (error) { 
            toast.error(error.response?.data?.message || "Gagal menyimpan tugas"); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const columns = useMemo(() => [
        { 
            header: 'Title', 
            accessorKey: 'title', 
            cell: info => (
                <Link to={`/tasks/${info.row.original.id}`} className="font-bold text-[#362765] hover:text-pink-500 transition-colors underline-offset-4 hover:underline">
                    {info.getValue()}
                </Link>
            ) 
        },
        { header: 'Assignee', accessorKey: 'assignee_names', cell: info => info.getValue() || <span className="text-gray-400 text-xs italic">Unassigned</span> },
        { header: 'Due Date', accessorKey: 'due_date', cell: info => dayjs(info.getValue()).format('DD MMM YYYY') },
        { 
            header: 'Priority', 
            accessorKey: 'priority',
            cell: info => {
                const colors = { high: 'bg-pink-100 text-pink-600', medium: 'bg-yellow-100 text-yellow-600', low: 'bg-green-100 text-green-600' };
                return <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors[info.getValue()] || 'bg-gray-100'}`}>{info.getValue()}</span>;
            }
        },
        { header: 'Status', accessorKey: 'status', cell: info => <span className="capitalize text-sm font-bold text-[#362765]">{info.getValue().replace('_', ' ')}</span> }
    ], []);

    // Matikan warning spesifik React Compiler untuk baris useReactTable
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({ 
        data: tasks, 
        columns, 
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel()
    });

    const getRowClassName = (row) => {
        if (row.original.status === 'done') return 'bg-white';
        const daysLeft = dayjs(row.original.due_date).startOf('day').diff(dayjs().startOf('day'), 'day');
        if (daysLeft < 0) return 'bg-pink-50/50 border-l-4 border-pink-500'; 
        if (daysLeft <= 2) return 'bg-yellow-50/50 border-l-4 border-yellow-400';
        return 'bg-white';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Manajemen Tugas</h1>
                <button onClick={() => setShowForm(!showForm)} className="flex justify-center items-center gap-2 bg-[#362765] text-white font-bold py-3 px-5 md:py-2.5 rounded-xl shadow-md text-sm w-full sm:w-auto">
                    {showForm ? 'Batal' : <><Plus size={18} /> Buat Task Baru</>}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={formParams.title} onChange={e => setFormParams({...formParams, title: e.target.value})} required className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm" placeholder="Judul Tugas *" />
                    <input type="date" min={dayjs().format('YYYY-MM-DD')} value={formParams.due_date} onChange={e => setFormParams({...formParams, due_date: e.target.value})} required className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm" />
                    <select value={formParams.project_id} onChange={e => setFormParams({...formParams, project_id: e.target.value})} className="w-full px-4 py-3 bg-[#f0f4fd] border-none rounded-xl outline-none text-sm">
                        {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <Select isMulti options={options.users} value={selectedAssignees} onChange={setSelectedAssignees} placeholder="Pilih Assignee..." styles={{ control: (base) => ({ ...base, backgroundColor: '#f0f4fd', border: 'none', borderRadius: '0.75rem', padding: '0.2rem' }) }} />
                    <div className="md:col-span-2 flex justify-end">
                        <button type="submit" disabled={isSaving} className="bg-green-500 text-white font-bold py-2.5 px-6 rounded-xl disabled:opacity-50">Simpan Tugas</button>
                    </div>
                </form>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-3 sm:py-2.5 bg-[#f0f4fd] rounded-xl outline-none text-sm" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#f0f4fd] rounded-xl px-4 py-3 sm:py-2.5 outline-none text-sm font-medium w-full sm:w-auto">
                        <option value="">Semua Status</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>
                </div>

                {error ? <div className="p-6"><ErrorState message={error} onRetry={fetchTasks} /></div> : 
                 isLoading ? <TableSkeleton /> : 
                 tasks.length === 0 ? (
                    <EmptyState 
                        title="Belum ada Task" 
                        message="Tim Anda belum memiliki tugas. Buat satu untuk memulai."
                        action={<button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition"><PlusCircle size={18}/> Buat Task Pertamamu</button>}
                    />
                 ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-gray-400 text-xs uppercase font-bold border-b border-gray-100 bg-gray-50/50">
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id}>
                                            {hg.headers.map(h => (
                                                <th 
                                                    key={h.id} 
                                                    onClick={h.column.getToggleSortingHandler()} 
                                                    className={`px-6 py-4 select-none ${h.column.getCanSort() ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                                        {{
                                                            asc: <span className="text-[#362765]">🔼</span>,
                                                            desc: <span className="text-[#362765]">🔽</span>,
                                                        }[h.column.getIsSorted()] ?? (
                                                            h.column.getCanSort() ? <ArrowUpDown size={12} className="text-gray-300" /> : null
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className={getRowClassName(row)}>
                                            {row.getVisibleCells().map(cell => <td key={cell.id} className="px-6 py-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden flex flex-col divide-y divide-gray-100">
                            {table.getRowModel().rows.map(row => {
                                const t = row.original;
                                return (
                                    <Link to={`/tasks/${t.id}`} key={t.id} className={`p-4 block ${t.status === 'done' ? 'bg-white' : dayjs(t.due_date).isBefore(dayjs()) ? 'bg-pink-50' : 'bg-white'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-800 text-base">{t.title}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${t.status==='done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{t.status.replace('_',' ')}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-3">
                                            <span>📅 {dayjs(t.due_date).format('DD MMM')}</span>
                                            <span className="font-medium text-[#362765]">{t.assignee_names || 'Unassigned'}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                 )}
                
                <div className="p-4 flex justify-between items-center text-sm font-medium text-gray-500 border-t border-gray-100">
                    <p>Page {page}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-[#f0f4fd] rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors">Prev</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={tasks.length < limit} className="px-4 py-2 bg-[#f0f4fd] rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tasks;