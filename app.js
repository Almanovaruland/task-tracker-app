// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();

// const authRoutes = require('./src/routes/authRoutes');
// const apiRoutes = require('./src/routes/apiRoutes'); // Tambahkan baris ini

// const app = express();

// app.use(cors());
// app.use(express.json());

// // Daftarkan routes
// app.use('/api/auth', authRoutes); // Untuk register & login
// app.use('/api', apiRoutes);       // Untuk seluruh CRUD Project & Task

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server berjalan di http://localhost:${PORT}`);
// });

const express = require('express');
const http = require('http'); // 1. Import modul HTTP bawaan Node
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const apiRoutes = require('./src/routes/apiRoutes');
const socketConfig = require('./src/config/socket'); // 2. Import config socket

const app = express();
const server = http.createServer(app); // 3. Bungkus app Express dengan server HTTP

// 4. Inisialisasi Socket.IO
socketConfig.init(server);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;

// 5. UBAH app.listen MENJADI server.listen
server.listen(PORT, () => {
    console.log(`Server Express & Socket.IO berjalan di http://localhost:${PORT}`);
});