import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
});

// Request Interceptor: Auto-attach Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Sinkronisasi pesan error backend ke Toast
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const backendMessage = error.response?.data?.message;

        if (!error.response) {
            toast.error('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
        } else if (status === 401) {
            toast.error(backendMessage || 'Sesi berakhir. Silakan login kembali.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        } else if (status === 403) {
            toast.error(backendMessage || 'Akses ditolak: Anda tidak memiliki izin.');
        } else if (status === 400 || status === 404) {
            toast.error(backendMessage || 'Permintaan tidak valid.');
        } else if (status >= 500) {
            toast.error(backendMessage || 'Terjadi kesalahan pada server.');
        }

        return Promise.reject(error);
    }
);

export default api;