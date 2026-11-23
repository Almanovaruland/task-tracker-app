const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// === ENDPOINT STATISTIK DASHBOARD ===
router.get('/stats', authenticateToken, taskController.getTaskStats);

// === ENDPOINT USERS ===
router.get('/users', authenticateToken, userController.getAllUsers);

// === ENDPOINT PROJECTS ===
router.get('/projects', authenticateToken, projectController.getAllProjects);
router.post('/projects', authenticateToken, authorizeRole(['manager']), projectController.createProject);
router.put('/projects/:id', authenticateToken, authorizeRole(['manager']), projectController.updateProject);
router.delete('/projects/:id', authenticateToken, authorizeRole(['manager']), projectController.deleteProject);

// === ENDPOINT TASKS ===
router.get('/tasks', authenticateToken, taskController.getAllTasks);
router.get('/tasks/:id', authenticateToken, taskController.getTaskById);
router.post('/tasks', authenticateToken, authorizeRole(['manager']), taskController.createTask);
router.put('/tasks/:id', authenticateToken, authorizeRole(['manager']), taskController.updateTask);
router.put('/tasks/:id/status', authenticateToken, taskController.updateTaskStatus);
router.post('/tasks/:id/assignees', authenticateToken, authorizeRole(['manager']), taskController.addAssignee);
router.delete('/tasks/:id', authenticateToken, authorizeRole(['manager']), taskController.deleteTask);

module.exports = router;