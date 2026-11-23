import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, LogOut, UserCircle, Bell, Menu, X, Mailbox, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { initiateSocketConnection } from '../services/socket';

dayjs.locale('id');

const NavigationLinks = ({ onNavClick }) => (
    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <NavLink 
            to="/" 
            onClick={onNavClick} 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-white text-[#362765] shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
        >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
        </NavLink>
        <NavLink 
            to="/tasks" 
            onClick={onNavClick}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-white text-[#362765] shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
        >
            <CheckSquare size={20} />
            <span>Tasks</span>
        </NavLink>
    </nav>
);

const Layout = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isManager = user.role === 'manager';
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const [notifications, setNotifications] = useState([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    const notifRef = useRef(null);

    useEffect(() => {
        const socket = initiateSocketConnection();
        
        const handleNewAssignment = (payload) => {
            if (!isManager) {
                const newNotif = {
                    id: Date.now() + Math.random(),
                    title: "Tugas Baru Ditugaskan",
                    message: "Anda telah ditugaskan untuk mengerjakan tugas baru. Silakan cek detailnya.",
                    time: new Date(),
                    isRead: false,
                    link: payload?.task_id ? `/tasks/${payload.task_id}` : '/tasks'
                };
                setNotifications(prev => [newNotif, ...prev]);
                toast("Tugas baru ditugaskan ke Anda!", { icon: "🔔", style: { background: '#362765', color: '#fff'} });
            }
        };

        const handleTaskUpdate = (payload) => {
            if (isManager) {
                const newNotif = {
                    id: Date.now() + Math.random(),
                    title: "Status Tugas Diperbarui",
                    message: `Tugas "${payload?.title || 'Sebuah tugas'}" telah diperbarui menjadi ${payload?.status?.replace('_', ' ') || 'status baru'}.`,
                    time: new Date(),
                    isRead: false,
                    link: payload?.id ? `/tasks/${payload.id}` : '/tasks'
                };
                setNotifications(prev => [newNotif, ...prev]);
                toast("Status tugas diperbarui oleh tim!", { icon: "📈", style: { background: '#10b981', color: '#fff'} });
            }
        };

        socket.on('task:assigned', handleNewAssignment);
        socket.on('task:updated', handleTaskUpdate);

        return () => {
            socket.off('task:assigned', handleNewAssignment);
            socket.off('task:updated', handleTaskUpdate);
        };
    }, [isManager]);

    // Deteksi klik di luar untuk menutup panel notifikasi
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.success("Berhasil logout");
        navigate('/login');
    };

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    const handleNotificationItemClick = (notif) => {
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setIsNotifOpen(false);
        navigate(notif.link); 
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="flex h-screen bg-[#f8f9fc] font-sans overflow-hidden">
            {/* SIDEBAR DESKTOP */}
            <aside className="hidden md:flex flex-col w-72 bg-[#362765] text-white shadow-xl z-20">
                <div className="p-8 flex items-center justify-center border-b border-white/10">
                    <div className="bg-white/10 p-3 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <CheckSquare size={32} className="text-pink-400" />
                    </div>
                </div>
                <NavigationLinks onNavClick={closeMobileMenu} />
                <div className="p-6 border-t border-white/10">
                    <div className="bg-black/20 rounded-2xl p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Role Anda:</p>
                        <span className="inline-block px-3 py-1 bg-white text-[#362765] text-xs font-bold rounded-lg uppercase tracking-wider">
                            {user.role || 'GUEST'}
                        </span>
                    </div>
                </div>
            </aside>

            {/* SIDEBAR MOBILE */}
            <div className={`md:hidden fixed inset-0 bg-[#362765] z-50 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full text-white">
                    <div className="p-6 flex justify-between items-center border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <CheckSquare size={28} className="text-pink-400" />
                            <span className="font-bold text-lg">Smart Task</span>
                        </div>
                        <button onClick={closeMobileMenu} className="text-gray-300 hover:text-white">
                            <X size={28} />
                        </button>
                    </div>
                    <NavigationLinks onNavClick={closeMobileMenu} />
                    <div className="p-6 border-t border-white/10">
                        <div className="bg-black/20 rounded-2xl p-4 text-center">
                            <p className="text-xs text-gray-400 mb-1">Role Anda:</p>
                            <span className="inline-block px-3 py-1 bg-white text-[#362765] text-xs font-bold rounded-lg uppercase tracking-wider">
                                {user.role || 'GUEST'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white h-20 px-4 md:px-8 flex items-center justify-between shadow-sm z-10 sticky top-0 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-[#362765]">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-gray-700 hidden md:block whitespace-nowrap">Welcome to Tasks Tracker</span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5">
                        
                        {/* WRAPPER NOTIFIKASI DROPDOWN */}
                        <div className="relative flex items-center gap-3 md:gap-4 border-r border-gray-100 pr-3 md:pr-5" ref={notifRef}>
                            <button 
                                onClick={() => setIsNotifOpen(!isNotifOpen)} 
                                className={`relative transition-colors p-2 rounded-full ${isNotifOpen ? 'bg-pink-50 text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-4 h-4 bg-pink-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm transform translate-x-1/4 -translate-y-1/4">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* PANEL NOTIFIKASI RESPONSIVE */}
                            {isNotifOpen && (
                                <div className="fixed sm:absolute top-[75px] sm:top-[120%] left-[50%] sm:left-auto right-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 w-[92vw] sm:w-[380px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[75vh]">
                                    
                                    {/* Header Panel */}
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-gray-800 text-base">Notifikasi</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllAsRead} className="text-[11px] font-bold text-[#362765] hover:text-pink-500 transition-colors flex items-center gap-1">
                                                <Check size={14} /> Tandai dibaca
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* List Notifikasi */}
                                    <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
                                        {notifications.length === 0 ? (
                                            <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                                <Mailbox size={32} className="mb-3 opacity-40" />
                                                <p className="text-sm font-medium">Belum ada notifikasi baru</p>
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div 
                                                    key={notif.id} 
                                                    onClick={() => handleNotificationItemClick(notif)}
                                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3.5 items-start ${!notif.isRead ? 'bg-[#f0f4fd]/50' : 'bg-white'}`}
                                                >
                                                    {/* Ikon Bulat */}
                                                    <div className="relative shrink-0 mt-0.5">
                                                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                                            <Mailbox size={18} />
                                                        </div>
                                                        {!notif.isRead && (
                                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Teks Konten */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`text-sm leading-snug ${!notif.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                                                            {notif.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                                            {notif.message}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                            {dayjs(notif.time).format('DD MMM YYYY - HH:mm WIB')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    {/* Footer Panel */}
                                    {notifications.length > 0 && (
                                        <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                                            <button 
                                                onClick={() => { setIsNotifOpen(false); navigate('/tasks'); }}
                                                className="text-xs font-bold text-[#362765] hover:text-pink-500"
                                            >
                                                Lihat Semua Tugas
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-800 leading-tight">{user.name || 'User'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#f0f4fd] text-[#362765] flex items-center justify-center font-bold">
                                <UserCircle size={24} />
                            </div>
                            <button onClick={handleLogout} className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-2">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8f9fc]">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;