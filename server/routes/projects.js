import { Router } from 'express';
import { getProjects, getProjectDetail } from '../controllers/projectsController.js';

const router = Router();

function cacheFor(seconds, swrSeconds) {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${swrSeconds}`);
    next();
  };
}

router.get('/', cacheFor(30, 60), getProjects);
router.get('/:slug', cacheFor(30, 60), getProjectDetail);

export default router;
