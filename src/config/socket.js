const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: { origin: '*' }
        });

        // Middleware Autentikasi Socket: Verifikasi JWT saat handshake
        io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Koneksi ditolak: Token tidak ditemukan'));
            }

            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) return next(new Error('Koneksi ditolak: Token tidak valid'));
                socket.user = decoded; // Simpan payload user (id, role) ke socket
                next();
            });
        });

        // Event saat client berhasil terhubung
        io.on('connection', (socket) => {
            console.log(`[Socket] User terhubung: ID \({socket.user.id} | Role:\){socket.user.role}`);

            // Konsep Room: Pisahkan manager dan staff
            if (socket.user.role === 'manager') {
                socket.join('managers');
                console.log(`[Socket] User ID ${socket.user.id} masuk ke room: managers`);
            } else {
                socket.join(`user:${socket.user.id}`);
                console.log(`[Socket] User ID \({socket.user.id} masuk ke room: user:\){socket.user.id}`);
            }

            socket.on('disconnect', () => {
                console.log(`[Socket] User ID ${socket.user.id} terputus`);
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) throw new Error('Socket.io belum diinisialisasi!');
        return io;
    }
};