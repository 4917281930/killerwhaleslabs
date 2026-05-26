import { Router } from 'express';
import { getProjects } from '../controllers/projectsController.js';

const router = Router();

router.get('/', getProjects);

export default router;
