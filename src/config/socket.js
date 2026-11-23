const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

module.exports = {
    init: (server) => {
        io = new Server(server, {
            cors: { origin: '*' }
        });

        // Middleware Autentikasi Socket Handshake (Sesuai Materi Minggu 4 Bulan 1 & Minggu 2 Bulan 3)
        io.use((socket, next) => {
            const token = socket.handshake.auth?.token;
            
            if (!token) {
                return next(new Error("Authentication error: Token tidak disertakan."));
            }

            // Bersihkan format 'Bearer ' jika dikirimkan dari sisi client
            const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

            // Verifikasi token JWT dan masa berlakunya
            jwt.verify(cleanToken, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    // Tangani error token kadaluarsa atau tidak valid
                    return next(new Error("Authentication error: Token tidak valid atau sudah kadaluarsa."));
                }
                
                // Simpan data user (id, role, dll) ke socket agar bisa diakses jika diperlukan
                socket.user = decoded;
                next();
            });
        });
        
        io.on('connection', (socket) => {
            console.log(`Client terhubung via WebSocket: ID ${socket.id} (User ID: ${socket.user?.id}, Role: ${socket.user?.role})`);

            // Bergabung ke room spesifik berdasarkan role atau user jika diperlukan
            if (socket.user?.role === 'manager') {
                socket.join('managers');
            } else if (socket.user?.id) {
                socket.join(`user:${socket.user.id}`);
            }

            socket.on('join_task', (taskId) => {
                socket.join(`task_${taskId}`);
            });

            socket.on('disconnect', () => {
                console.log('Client terputus:', socket.id);
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error("Socket.io belum diinisialisasi!");
        }
        return io;
    }
};