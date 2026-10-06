const jwt = require('jsonwebtoken');

// Middleware untuk memverifikasi token JWT (Authentication)
exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Format header biasanya: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
        }
        
        // Simpan data payload JWT ke objek request (req.user) agar bisa dipakai controller
        req.user = user; 
        next();
    });
};

// Middleware untuk membatasi akses berdasarkan role (Authorization)
exports.authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Anda tidak memiliki izin (role) untuk mengakses ini.' });
        }
        next();
    };
};