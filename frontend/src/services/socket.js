import { io } from 'socket.io-client';

// Sesuaikan URL backend Anda
const SOCKET_URL = 'http://localhost:3000'; 
let socketInstance = null; // Variabel global untuk menyimpan 1 koneksi tunggal

export const initiateSocketConnection = () => {
    // Hanya buat koneksi baru JIKA socketInstance belum ada
    if (!socketInstance) {
        const token = localStorage.getItem('token');
        socketInstance = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'] // Memaksa menggunakan murni websocket agar lebih cepat
        });

        socketInstance.on('connect', () => {
            console.log('Socket terhubung ke server dengan ID:', socketInstance.id);
        });
    }
    
    return socketInstance;
};