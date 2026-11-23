const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

// === GLOBAL ERROR HANDLER PROSES NODE.JS ===
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL - UNCAUGHT EXCEPTION]:', err.name, err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL - UNHANDLED REJECTION] at:', promise, 'reason:', reason);
});

const authRoutes = require('./src/routes/authRoutes');
const apiRoutes = require('./src/routes/apiRoutes');
const socketConfig = require('./src/config/socket');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Inisialisasi Socket.IO
socketConfig.init(server);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Handler Rute Tidak Ditemukan (404)
app.use((req, res) => {
    res.status(404).json({
        code: 'ENDPOINT_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`
    });
});

// Express Global Error Handler (Wajib paling bawah)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server Express & Socket.IO berjalan di http://localhost:${PORT}`);
});