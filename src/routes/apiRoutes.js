const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// === ENDPOINT PROJECTS ===
router.get('/projects', authenticateToken, projectController.getAllProjects);
router.post('/projects', authenticateToken, authorizeRole(['manager']), projectController.createProject);
router.put('/projects/:id', authenticateToken, authorizeRole(['manager']), projectController.updateProject);
router.delete('/projects/:id', authenticateToken, authorizeRole(['manager']), projectController.deleteProject);

// === ENDPOINT TASKS ===
router.get('/tasks', authenticateToken, taskController.getAllTasks);
router.get('/tasks/:id', authenticateToken, taskController.getTaskById);
router.post('/tasks', authenticateToken, authorizeRole(['manager']), taskController.createTask);
router.put('/tasks/:id', authenticateToken, authorizeRole(['manager']), taskController.updateTaskDetail);
router.delete('/tasks/:id', authenticateToken, authorizeRole(['manager']), taskController.deleteTask);

// Endpoint Update Status (Bisa diakses Staff, tapi dicek ownership-nya di dalam controller)
router.put('/tasks/:id/status', authenticateToken, taskController.updateTaskStatus);

// === ENDPOINT PIVOT ASSIGNEES ===
router.post('/tasks/:id/assignees', authenticateToken, authorizeRole(['manager']), taskController.addAssignee);
router.delete('/tasks/:id/assignees/:user_id', authenticateToken, authorizeRole(['manager']), taskController.removeAssignee);

module.exports = router;