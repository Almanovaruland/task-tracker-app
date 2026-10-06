const db = require('../config/db');

// GET /api/projects
exports.getAllProjects = async (req, res) => {
    try {
        const [projects] = await db.execute('SELECT * FROM projects');
        res.json({ data: projects });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

// POST /api/projects (Manager Only)
exports.createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const [result] = await db.execute(
            'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)',
            [name, description, req.user.id] // req.user.id didapat dari token JWT
        );

        // Kueri tambahan untuk mengambil detail data yang baru saja dimasukkan
        const [newProject] = await db.execute('SELECT * FROM projects WHERE id = ?', [result.insertId]);

        res.status(201).json({ 
            message: 'Project berhasil dibuat', 
            data: newProject[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

// PUT /api/projects/:id (Manager Only)
exports.updateProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        await db.execute(
            'UPDATE projects SET name = ?, description = ? WHERE id = ?',
            [name, description, req.params.id]
        );

        // Kueri tambahan untuk mengambil detail data setelah diperbarui
        const [updatedProject] = await db.execute('SELECT * FROM projects WHERE id = ?', [req.params.id]);

        if (updatedProject.length === 0) {
            return res.status(404).json({ message: 'Project tidak ditemukan' });
        }

        res.json({ 
            message: 'Project berhasil diperbarui', 
            data: updatedProject[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

// DELETE /api/projects/:id (Manager Only)
exports.deleteProject = async (req, res) => {
    try {
        // Kueri tambahan untuk mengambil detail data sebelum dihapus (sebagai informasi balasan)
        const [projectToDelete] = await db.execute('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        
        if (projectToDelete.length === 0) {
            return res.status(404).json({ message: 'Project tidak ditemukan' });
        }

        await db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
        
        res.json({ 
            message: 'Project berhasil dihapus',
            data: projectToDelete[0] 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};