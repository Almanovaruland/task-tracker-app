const socket = require('../config/socket');
const db = require('../config/db');

// HELPER: Fungsi untuk mengambil data task secara utuh (termasuk JOIN dengan user)
const getCompleteTaskData = async (taskId) => {
    const [tasks] = await db.execute(`
        SELECT t.*, 
        GROUP_CONCAT(u.id) as assignee_ids,
        GROUP_CONCAT(u.name SEPARATOR ', ') as assignee_names 
        FROM tasks t 
        LEFT JOIN task_assignees ta ON t.id = ta.task_id 
        LEFT JOIN users u ON ta.user_id = u.id 
        WHERE t.id = ? GROUP BY t.id
    `, [taskId]);
    return tasks[0];
};

// GET /api/tasks (Dengan JOIN, Search, Filter, Pagination)
exports.getAllTasks = async (req, res) => {
    try {
        const { project_id, status, priority, assignee_id, q, page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        
        let query = `
            SELECT t.*, 
            GROUP_CONCAT(u.id) as assignee_ids,
            GROUP_CONCAT(u.name SEPARATOR ', ') as assignee_names
            FROM tasks t 
            LEFT JOIN task_assignees ta ON t.id = ta.task_id 
            LEFT JOIN users u ON ta.user_id = u.id
        `;
        
        const params = [];
        const conditions = [];

        if (project_id) { conditions.push('t.project_id = ?'); params.push(project_id); }
        if (status) { conditions.push('t.status = ?'); params.push(status); }
        if (priority) { conditions.push('t.priority = ?'); params.push(priority); }
        if (assignee_id) { conditions.push('ta.user_id = ?'); params.push(assignee_id); }
        if (q) { conditions.push('t.title LIKE ?'); params.push(`%${q}%`); }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY t.id LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const [tasks] = await db.query(query, params);
        res.json({ page: Number(page), data: tasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};

// GET /api/tasks/:id
exports.getTaskById = async (req, res) => {
    try {
        const task = await getCompleteTaskData(req.params.id);

        if (!task) return res.status(404).json({ message: 'Task tidak ditemukan' });
        res.json({ data: task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};

// POST /api/tasks (Manager Only - Transaksi Insert ke 2 Tabel)
exports.createTask = async (req, res) => {
    const conn = await db.getConnection(); 
    try {
        await conn.beginTransaction(); 
        const { project_id, title, description, due_date, priority, status, assignees } = req.body;
        
        const [taskResult] = await conn.execute(
            'INSERT INTO tasks (project_id, title, description, due_date, priority, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [project_id, title, description, due_date, priority, status || 'todo', req.user.id]
        );
        const newTaskId = taskResult.insertId;

        const io = socket.getIo();

        if (assignees && Array.isArray(assignees) && assignees.length > 0) {
            for (let user_id of assignees) {
                await conn.execute('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [newTaskId, user_id]);
            }
        }

        await conn.commit(); 
        
        // Ambil data utuh yang sudah di-commit untuk dikirim via Socket dan Response
        const finalTask = await getCompleteTaskData(newTaskId);

        // EMIT ke staff yang bersangkutan setelah data utuh didapat
        if (assignees && Array.isArray(assignees) && assignees.length > 0) {
            for (let user_id of assignees) {
                io.to(`user:${user_id}`).emit('task:assigned', { 
                    message: 'Anda ditugaskan ke task baru',
                    data: finalTask
                });
            }
        }
        
        // EMIT ke semua manager
        io.to('managers').emit('task:created', { 
            message: 'Task baru berhasil dibuat',
            data: finalTask 
        });
        
        res.status(201).json({ 
            message: 'Task berhasil dibuat', 
            data: finalTask 
        });
    } catch (error) {
        await conn.rollback(); 
        console.error(error);
        res.status(500).json({ message: 'Error server, transaksi dibatalkan' });
    } finally {
        conn.release(); 
    }
};

// PUT /api/tasks/:id (Manager Only - Edit Detail)
exports.updateTaskDetail = async (req, res) => {
    try {
        const { title, description, due_date, priority } = req.body;
        await db.execute(
            'UPDATE tasks SET title=?, description=?, due_date=?, priority=? WHERE id=?',
            [title, description, due_date, priority, req.params.id]
        );

        // Ambil data terbaru setelah diperbarui
        const updatedTask = await getCompleteTaskData(req.params.id);

        socket.getIo().emit('task:updated', { 
            message: 'Detail task telah diperbarui',
            data: updatedTask
        });

        res.json({ 
            message: 'Detail task berhasil diperbarui', 
            data: updatedTask 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};

// PUT /api/tasks/:id/status (Ownership Check: Hanya assignee atau manager yang boleh edit)
exports.updateTaskStatus = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const { status } = req.body;

        if (req.user.role !== 'manager') {
            const [pivotCheck] = await db.execute('SELECT * FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, userId]);
            if (pivotCheck.length === 0) return res.status(403).json({ message: 'Akses ditolak.' });
        }

        await db.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
        
        // Ambil data terbaru setelah status berubah
        const updatedTask = await getCompleteTaskData(taskId);

        socket.getIo().emit('task:updated', { 
            message: `Status diubah menjadi ${status}`,
            data: updatedTask
        });

        res.json({ 
            message: 'Status task berhasil diubah',
            data: updatedTask
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};

// DELETE /api/tasks/:id (Manager Only)
exports.deleteTask = async (req, res) => {
    try {
        // Ambil data task sebelum dihapus untuk dikembalikan sebagai log
        const taskToDelete = await getCompleteTaskData(req.params.id);
        
        if (!taskToDelete) {
            return res.status(404).json({ message: 'Task tidak ditemukan' });
        }

        await db.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        
        res.json({ 
            message: 'Task berhasil dihapus',
            data: taskToDelete
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};

// POST /api/tasks/:id/assignees (Manager Only - Insert ke tabel pivot)
exports.addAssignee = async (req, res) => {
    try {
        const { user_id } = req.body;
        await db.execute('INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)', [req.params.id, user_id]);
        
        // Ambil data task terbaru yang sudah memuat nama assignee baru
        const updatedTask = await getCompleteTaskData(req.params.id);

        socket.getIo().to(`user:${user_id}`).emit('task:assigned', { 
            message: 'Anda ditambahkan ke task yang sudah ada',
            data: updatedTask
        });

        res.json({ 
            message: 'Assignee berhasil ditambahkan',
            data: updatedTask
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};

// DELETE /api/tasks/:id/assignees/:user_id (Manager Only - Hapus dari tabel pivot)
exports.removeAssignee = async (req, res) => {
    try {
        await db.execute('DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?', [req.params.id, req.params.user_id]);
        
        // Ambil data task terbaru yang sudah tidak memuat nama assignee tersebut
        const updatedTask = await getCompleteTaskData(req.params.id);

        res.json({ 
            message: 'Assignee berhasil dihapus dari task',
            data: updatedTask
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
};