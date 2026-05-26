import { Router } from 'express';
import { login, logout, me } from '../controllers/adminController.js';
import { uploadLogo } from '../controllers/uploadsController.js';
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject
} from '../controllers/projectsController.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginRateLimit, login);
router.post('/logout', requireAdmin, logout);
router.get('/me', requireAdmin, me);
router.get('/projects', requireAdmin, getProjects);
router.post('/uploads/logo', requireAdmin, uploadLogo);
router.post('/projects', requireAdmin, createProject);
router.put('/projects/:id', requireAdmin, updateProject);
router.patch('/projects/:id', requireAdmin, updateProject);
router.delete('/projects/:id', requireAdmin, deleteProject);

export default router;
