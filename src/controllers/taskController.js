const db = require('../config/db');
const socketConfig = require('../config/socket');
const { sanitizeFreetext } = require('../utils/sanitizer');

// GET /api/tasks - Mengambil daftar task sesuai role dan filter
exports.getAllTasks = async (req, res, next) => {
    try {
        const { q, status, priority, project_id, assignee_id, page = 1, limit = 100 } = req.query;
        const offset = (page - 1) * parseInt(limit);

        let query = `
            SELECT 
                t.*, 
                p.name AS project_name,
                GROUP_CONCAT(u.name SEPARATOR ', ') AS assignee_names,
                GROUP_CONCAT(u.id) AS assignee_ids
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE 1=1
        `;

        const queryParams = [];

        if (req.user && req.user.role === 'staff') {
            query += ` AND t.id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)`;
            queryParams.push(req.user.id);
        } else if (assignee_id) {
            query += ` AND t.id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)`;
            queryParams.push(assignee_id);
        }

        if (q) {
            query += ` AND t.title LIKE ?`;
            queryParams.push(`%${sanitizeFreetext(q, 100)}%`);
        }
        if (status) {
            query += ` AND t.status = ?`;
            queryParams.push(status);
        }
        if (priority) {
            query += ` AND t.priority = ?`;
            queryParams.push(priority);
        }
        if (project_id) {
            query += ` AND t.project_id = ?`;
            queryParams.push(project_id);
        }

        query += ` GROUP BY t.id ORDER BY t.id ASC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [tasks] = await db.query(query, queryParams);

        res.status(200).json({ status: 'success', data: tasks });
    } catch (error) {
        next(error);
    }
};

// GET /api/tasks/:id - Mengambil detail task berdasarkan ID
exports.getTaskById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [tasks] = await db.query(`
            SELECT 
                t.*, 
                p.name AS project_name,
                GROUP_CONCAT(u.id) AS assignee_ids,
                GROUP_CONCAT(u.name SEPARATOR ', ') AS assignee_names
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE t.id = ?
            GROUP BY t.id
        `, [id]);

        if (tasks.length === 0) {
            return res.status(404).json({ code: 'TASK_NOT_FOUND', message: "Tugas tidak ditemukan." });
        }

        const task = tasks[0];
        task.assignee_ids = task.assignee_ids ? task.assignee_ids.split(',').map(Number) : [];

        res.status(200).json({ status: 'success', data: task });
    } catch (error) {
        next(error);
    }
};

// POST /api/tasks - Membuat task baru (Manager only dengan Validasi & Sanitasi)
exports.createTask = async (req, res, next) => {
    try {
        let { project_id, title, description, due_date, priority, assignees } = req.body;
        const created_by = req.user.id;

        // 1. Sanitasi Input Freetext
        title = sanitizeFreetext(title, 150);
        description = sanitizeFreetext(description, 2000);
        const cleanPriority = priority ? sanitizeFreetext(priority, 20) : 'medium';

        // 2. Validasi Field Wajib
        if (!project_id || !title || !due_date) {
            return res.status(400).json({ 
                code: 'VALIDATION_ERROR', 
                message: "Judul, ID Proyek, dan Tanggal Deadline (due_date) wajib diisi." 
            });
        }

        // 3. Validasi ENUM Priority
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(cleanPriority)) {
            return res.status(400).json({ 
                code: 'INVALID_ENUM', 
                message: "Prioritas harus bernilai: low, medium, atau high." 
            });
        }

        // 4. Validasi Due Date (Tidak boleh di masa lalu)
        const today = new Date().toISOString().split('T')[0];
        if (due_date < today) {
            return res.status(400).json({ 
                code: 'INVALID_DUE_DATE', 
                message: "Tanggal deadline (due_date) tidak boleh diisi tanggal yang sudah lewat." 
            });
        }

        // 5. Validasi Keberadaan Project
        const [projects] = await db.query('SELECT id FROM projects WHERE id = ?', [project_id]);
        if (projects.length === 0) {
            return res.status(404).json({ 
                code: 'PROJECT_NOT_FOUND', 
                message: "Proyek yang dituju tidak ditemukan." 
            });
        }

        // 6. Validasi Duplikat Assignee di Array Payload
        if (assignees && Array.isArray(assignees)) {
            const uniqueCheck = new Set(assignees.map(Number));
            if (uniqueCheck.size !== assignees.length) {
                return res.status(400).json({ 
                    code: 'DUPLICATE_ASSIGNEE', 
                    message: 'Terdapat duplikat penugasan staff untuk task yang sama.' 
                });
            }
        }

        // 7. Insert Task
        const [result] = await db.query(
            'INSERT INTO tasks (project_id, title, description, due_date, priority, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [project_id, title, description, due_date, cleanPriority, created_by]
        );

        const taskId = result.insertId;

        // 8. Insert Assignees
        if (assignees && Array.isArray(assignees) && assignees.length > 0) {
            const pivotValues = assignees.map(userId => [taskId, userId]);
            await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES ?', [pivotValues]);
        }

        // Emit Socket.IO
        try {
            const io = socketConfig.getIo();
            io.emit('task:created', { id: taskId, title });
            if (assignees && assignees.length > 0) {
                io.emit('task:assigned', { task_id: taskId, assignees });
            }
        } catch (socketErr) {
            console.error("Socket emit error:", socketErr);
        }

        res.status(201).json({
            status: 'success',
            message: "Tugas berhasil dibuat",
            data: { id: taskId, title }
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/tasks/:id - Edit detail task (Manager only)
exports.updateTask = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { title, description, due_date, priority, status } = req.body;

        const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ code: 'TASK_NOT_FOUND', message: "Tugas tidak ditemukan." });
        }

        const currentTask = tasks[0];
        const cleanTitle = title ? sanitizeFreetext(title, 150) : currentTask.title;
        const cleanDesc = description !== undefined ? sanitizeFreetext(description, 2000) : currentTask.description;
        const cleanPriority = priority ? sanitizeFreetext(priority, 20) : currentTask.priority;
        const cleanStatus = status ? sanitizeFreetext(status, 20) : currentTask.status;
        const newDueDate = due_date || currentTask.due_date;

        if (!['low', 'medium', 'high'].includes(cleanPriority)) {
            return res.status(400).json({ code: 'INVALID_ENUM', message: "Priority harus low, medium, atau high." });
        }
        if (!['todo', 'in_progress', 'done'].includes(cleanStatus)) {
            return res.status(400).json({ code: 'INVALID_ENUM', message: "Status harus todo, in_progress, atau done." });
        }

        const today = new Date().toISOString().split('T')[0];
        if (due_date && due_date < today) {
            return res.status(400).json({ code: 'INVALID_DUE_DATE', message: "Due date tidak boleh di masa lalu." });
        }

        await db.query(
            'UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, status = ?, updated_at = NOW() WHERE id = ?',
            [cleanTitle, cleanDesc, newDueDate, cleanPriority, cleanStatus, id]
        );

        res.status(200).json({ status: 'success', message: "Detail tugas berhasil diperbarui." });
    } catch (error) {
        next(error);
    }
};

// POST /api/tasks/:id/assignees - Tambah assignee satuan (Manager only)
exports.addAssignee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ code: 'VALIDATION_ERROR', message: "user_id wajib disertakan." });
        }

        const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ?', [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ code: 'TASK_NOT_FOUND', message: "Tugas tidak ditemukan." });
        }

        try {
            await db.query('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [id, user_id]);
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    code: 'DUPLICATE_ASSIGNEE',
                    message: "Staff tersebut sudah ditugaskan pada task ini (Duplikat ditolak)."
                });
            }
            throw err;
        }

        try {
            const io = socketConfig.getIo();
            io.emit('task:assigned', { task_id: id, assignees: [user_id] });
        } catch (socketErr) {
            console.error("Socket emit error:", socketErr);
        }

        res.status(201).json({ status: 'success', message: "Staff berhasil ditugaskan ke task." });
    } catch (error) {
        next(error);
    }
};

// PUT /api/tasks/:id/status - Update status task
exports.updateTaskStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        const cleanStatus = sanitizeFreetext(status, 20);
        const validStatuses = ['todo', 'in_progress', 'done'];
        if (!validStatuses.includes(cleanStatus)) {
            return res.status(400).json({ code: 'INVALID_ENUM', message: "Status tidak valid. Pilihan: todo, in_progress, done." });
        }

        const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ code: 'TASK_NOT_FOUND', message: "Tugas tidak ditemukan." });
        }

        if (userRole === 'staff') {
            const [assignments] = await db.query('SELECT * FROM task_assignees WHERE task_id = ? AND user_id = ?', [id, userId]);
            if (assignments.length === 0) {
                return res.status(403).json({ code: 'FORBIDDEN_ACTION', message: "Akses ditolak. Anda bukan assignee tugas ini." });
            }
        }

        await db.query('UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?', [cleanStatus, id]);

        const [updatedTasks] = await db.query(`
            SELECT 
                t.*, p.name AS project_name,
                GROUP_CONCAT(u.id) AS assignee_ids, GROUP_CONCAT(u.name SEPARATOR ', ') AS assignee_names
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE t.id = ? GROUP BY t.id
        `, [id]);

        const updatedTask = updatedTasks[0];
        updatedTask.assignee_ids = updatedTask.assignee_ids ? updatedTask.assignee_ids.split(',').map(Number) : [];

        try {
            const io = socketConfig.getIo();
            io.emit('task:updated', updatedTask); 
        } catch (socketErr) {
            console.error("Socket emit error:", socketErr);
        }

        res.status(200).json({ status: 'success', message: "Status tugas berhasil diperbarui", data: updatedTask });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/tasks/:id - Hapus task (Manager only)
exports.deleteTask = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ?', [id]);
        if (tasks.length === 0) {
            return res.status(404).json({ code: 'TASK_NOT_FOUND', message: "Tugas tidak ditemukan." });
        }

        await db.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.status(200).json({ status: 'success', message: "Tugas berhasil dihapus" });
    } catch (error) {
        next(error);
    }
};

// GET /api/stats - Mengambil statistik tugas menyesuaikan Role
exports.getTaskStats = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let projectQuery = '';
        let statsQuery = '';
        let overdueQuery = '';
        let queryParams = [];

        if (role === 'manager') {
            projectQuery = 'SELECT COUNT(id) AS total_projects FROM projects';
            statsQuery = `
                SELECT 
                    COUNT(id) AS total_tasks,
                    IFNULL(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                    IFNULL(SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_tasks,
                    IFNULL(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks
                FROM tasks
            `;
            overdueQuery = `
                SELECT COUNT(id) AS overdue_tasks
                FROM tasks
                WHERE due_date < CURDATE() AND status != 'done'
            `;
        } else {
            projectQuery = `
                SELECT COUNT(DISTINCT t.project_id) AS total_projects 
                FROM tasks t 
                JOIN task_assignees ta ON t.id = ta.task_id 
                WHERE ta.user_id = ?
            `;
            statsQuery = `
                SELECT 
                    COUNT(t.id) AS total_tasks,
                    IFNULL(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) AS completed_tasks,
                    IFNULL(SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END), 0) AS todo_tasks,
                    IFNULL(SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_tasks
                FROM tasks t
                JOIN task_assignees ta ON t.id = ta.task_id
                WHERE ta.user_id = ?
            `;
            overdueQuery = `
                SELECT COUNT(t.id) AS overdue_tasks
                FROM tasks t
                JOIN task_assignees ta ON t.id = ta.task_id
                WHERE t.due_date < CURDATE() AND t.status != 'done' AND ta.user_id = ?
            `;
            queryParams = [userId];
        }

        const [projectResult] = await db.query(projectQuery, queryParams);
        const totalProjects = projectResult[0].total_projects || 0;

        const [taskStatsResult] = await db.query(statsQuery, queryParams);
        const taskStats = taskStatsResult[0];

        const [overdueResult] = await db.query(overdueQuery, queryParams);
        const overdueTasks = overdueResult[0].overdue_tasks || 0;

        res.status(200).json({
            status: 'success',
            data: {
                total_projects: totalProjects,
                total_tasks: taskStats.total_tasks || 0,
                completed_tasks: taskStats.completed_tasks || 0,
                todo_tasks: taskStats.todo_tasks || 0,
                in_progress_tasks: taskStats.in_progress_tasks || 0,
                overdue_tasks: overdueTasks
            }
        });
    } catch (error) {
        next(error);
    }
};