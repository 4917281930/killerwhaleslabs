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
import { loginRateLimit, adminRateLimit, uploadRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginRateLimit, login);
router.post('/logout', requireAdmin, logout);
router.get('/me', requireAdmin, me);
router.get('/projects', requireAdmin, adminRateLimit, getProjects);
router.post('/uploads/logo', requireAdmin, uploadRateLimit, uploadLogo);
router.post('/projects', requireAdmin, adminRateLimit, createProject);
router.put('/projects/:id', requireAdmin, adminRateLimit, updateProject);
router.patch('/projects/:id', requireAdmin, adminRateLimit, updateProject);
router.delete('/projects/:id', requireAdmin, adminRateLimit, deleteProject);

export default router;
