const db = require('../config/db'); // Sesuaikan path koneksi database MySQL Anda

// GET /api/users - Hanya mengambil user yang ber-role 'staff'
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            "SELECT id, name, email, role FROM users WHERE role = 'staff' ORDER BY name ASC"
        );

        res.status(200).json({
            status: 'success',
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            message: 'Gagal mengambil data staff dari database',
            error: error.message
        });
    }
};