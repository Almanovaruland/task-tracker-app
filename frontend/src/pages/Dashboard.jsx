import { useState, useEffect, useCallback } from 'react';
import { Folder, CheckSquare, CheckCircle2, AlertTriangle, ArrowUpRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api';
import { initiateSocketConnection } from '../services/socket';
import { CardSkeleton, ErrorState } from '../components/UXStates';

dayjs.locale('id');

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Ambil data user dari local storage untuk deteksi role
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isManager = user?.role === 'manager';

    const fetchStats = useCallback(async (isSilentRefresh = false) => {
        if (!isSilentRefresh) setIsLoading(true); 
        setError(null);
        try {
            const res = await api.get('/stats');
            setStats(res.data.data || res.data);
        } catch {
            setStats({ total_projects: 0, total_tasks: 0, completed_tasks: 0, overdue_tasks: 0, todo_tasks: 0, in_progress_tasks: 0 });
            setError("Gagal memuat data statistik. Periksa koneksi Anda.");
        } finally {
            if (!isSilentRefresh) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchStats();

        const socket = initiateSocketConnection();
        const handleStatsUpdate = () => fetchStats(true); 

        socket.on('task:updated', handleStatsUpdate);
        socket.on('task:created', handleStatsUpdate);
        socket.on('task:assigned', handleStatsUpdate);

        return () => {
            socket.off('task:updated', handleStatsUpdate);
            socket.off('task:created', handleStatsUpdate);
            socket.off('task:assigned', handleStatsUpdate);
        };
    }, [fetchStats]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-7 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                    <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
                </div>
            </div>
        );
    }

    if (error && !stats?.total_tasks) {
        return <ErrorState message={error} onRetry={() => fetchStats(false)} />;
    }

    const completedPercent = stats?.total_tasks ? Math.round(((stats.completed_tasks || 0) / stats.total_tasks) * 100) : 0;
    const overduePercent = stats?.total_tasks ? Math.round(((stats.overdue_tasks || 0) / stats.total_tasks) * 100) : 0;

    const statCards = [
        { title: 'Total Projects', value: stats?.total_projects ?? 0, icon: <Folder size={22} className="text-pink-500" />, borderColor: 'border-l-pink-500', bgColor: 'bg-pink-50/50' },
        { title: 'Total Tasks', value: stats?.total_tasks ?? 0, icon: <CheckSquare size={22} className="text-[#362765]" />, borderColor: 'border-l-[#362765]', bgColor: 'bg-[#f0f4fd]' },
        { title: 'Completed', value: stats?.completed_tasks ?? 0, icon: <CheckCircle2 size={22} className="text-emerald-500" />, borderColor: 'border-l-emerald-500', bgColor: 'bg-emerald-50/50' },
        { title: 'Overdue', value: stats?.overdue_tasks ?? 0, icon: <AlertTriangle size={22} className="text-amber-500" />, borderColor: 'border-l-amber-500', bgColor: 'bg-amber-50/50' }
    ];

    const chartData = [
        { name: 'To Do', jumlah: parseInt(stats?.todo_tasks || 0), color: '#f59e0b' },
        { name: 'In Progress', jumlah: parseInt(stats?.in_progress_tasks || 0), color: '#3b82f6' },
        { name: 'Done', jumlah: parseInt(stats?.completed_tasks || 0), color: '#10b981' },
    ];

    return (
        <div className="space-y-5 md:space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-xl md:text-3xl font-extrabold text-gray-800">Ringkasan Kinerja</h1>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                        {isManager 
                            ? "Pantau progres proyek dan tugas tim Anda secara live" 
                            : "Pantau progres tugas yang ditugaskan kepada Anda secara live"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-sm font-bold text-gray-600">
                        <Calendar size={16} className="text-[#362765]" />
                        {dayjs().format('dddd, DD MMMM YYYY')}
                    </div>
                    <Link to="/tasks" className="inline-flex items-center gap-1 text-xs md:text-sm font-bold bg-[#f0f4fd] text-[#362765] px-4 py-2 rounded-xl hover:bg-[#e4ebfa] transition-colors">
                        Lihat Semua <ArrowUpRight size={16} />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                {statCards.map((card, idx) => (
                    <div key={idx} className={`bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4 ${card.borderColor} flex items-center justify-between gap-2 hover:shadow-md transition-shadow`}>
                        <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-semibold text-gray-400 truncate tracking-wider uppercase">{card.title}</p>
                            <h3 className="text-xl sm:text-3xl font-extrabold text-gray-800 mt-1">{card.value}</h3>
                        </div>
                        <div className={`p-2.5 sm:p-3 rounded-xl ${card.bgColor} shrink-0`}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
                
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px]">
                    <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-6">Distribusi Status Tugas</h2>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={45}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#6b7280' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip cursor={{fill: '#f8f9fc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[350px]">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800">Statistik Kritis</h2>
                        <span className="text-[10px] sm:text-xs px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Update Otomatis
                        </span>
                    </div>

                    <div className="flex flex-col justify-center flex-1 space-y-8">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tugas Selesai</p>
                                    <p className="text-lg font-black text-gray-800">{stats?.completed_tasks ?? 0} <span className="text-sm font-medium text-gray-400">dari {stats?.total_tasks ?? 0}</span></p>
                                </div>
                                <span className="text-lg font-black text-emerald-500">{completedPercent}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${completedPercent}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Terlambat / Overdue</p>
                                    <p className="text-lg font-black text-gray-800">{stats?.overdue_tasks ?? 0} <span className="text-sm font-medium text-gray-400">Tugas</span></p>
                                </div>
                                <span className="text-lg font-black text-amber-500">{overduePercent}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${overduePercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;