import { AlertTriangle, FolderOpen, RefreshCcw } from 'lucide-react';

// 1. Skeleton untuk Kartu Dashboard
export const CardSkeleton = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 animate-pulse">
        <div className="w-14 h-14 bg-gray-200 rounded-2xl"></div>
        <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        </div>
    </div>
);

// 2. Skeleton untuk Tabel & List
export const TableSkeleton = () => (
    <div className="space-y-4 animate-pulse p-4">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl w-full"></div>
        ))}
    </div>
);

// 3. State Kosong (Empty State)
export const EmptyState = ({ title = "Data Kosong", message = "Belum ada data untuk ditampilkan", icon = <FolderOpen size={48} />, action }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
        <div className="text-gray-300 mb-4">{icon}</div>
        <h3 className="text-lg font-bold text-gray-700 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">{message}</p>
        {action}
    </div>
);

// 4. State Error
export const ErrorState = ({ message = "Terjadi kesalahan", onRetry }) => (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-red-50 rounded-2xl border border-red-100">
        <AlertTriangle size={40} className="text-red-400 mb-3" />
        <h3 className="text-md font-bold text-red-800 mb-1">Oops! Sesuatu salah</h3>
        <p className="text-sm text-red-600 mb-4">{message}</p>
        {onRetry && (
            <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 font-medium rounded-xl shadow-sm hover:bg-red-50 transition-colors text-sm">
                <RefreshCcw size={16} /> Coba Lagi
            </button>
        )}
    </div>
);