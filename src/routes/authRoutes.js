const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// ==========================================
// ENDPOINT AUTENTIKASI (Public)
// ==========================================
router.post('/register', register);
router.post('/login', login);

// ==========================================
// ENDPOINT DUMMY (Protected / Membutuhkan Token)
// ==========================================

// Endpoint yang bisa diakses semua user yang sudah login (Staff & Manager)
router.get('/dummy/profile', authenticateToken, (req, res) => {
    res.json({ message: `Selamat datang user dengan ID ${req.user.id}, role Anda:${req.user.role}` });
});

// Endpoint yang HANYA bisa diakses oleh role 'manager'
router.get('/dummy/manager-only', authenticateToken, authorizeRole(['manager']), (req, res) => {
    res.json({ message: 'Ini adalah data rahasia yang hanya bisa dilihat oleh manajer.' });
});

module.exports = router;