import {
  createProjectRecord,
  deleteProjectRecord,
  listProjects,
  updateProjectRecord
} from '../services/projectsService.js';
import { asyncHandler, httpError } from '../utils/errors.js';
import { validateProject } from '../utils/validation.js';

export const getProjects = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: listProjects() });
});

export const createProject = asyncHandler(async (req, res) => {
  const payload = validateProject(req.body);
  const project = createProjectRecord(payload);
  res.status(201).json({ success: true, data: project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Invalid project id');

  const payload = validateProject(req.body);
  const project = updateProjectRecord(id, payload);
  if (!project) throw httpError(404, 'Project not found');

  res.json({ success: true, data: project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Invalid project id');

  const deleted = deleteProjectRecord(id);
  if (!deleted) throw httpError(404, 'Project not found');

  res.json({ success: true, data: { id } });
});
