import {
  countProjectsUsingLogo,
  createProjectRecord,
  deleteProjectRecord,
  getProjectById,
  getProjectBySlug,
  listProjects,
  updateProjectRecord
} from '../services/projectsService.js';
import { deleteLogoByUrl } from '../services/logoStorageService.js';
import { asyncHandler, httpError } from '../utils/errors.js';
import { validateProject } from '../utils/validation.js';

async function cleanupOrphanedLogo(logoUrl) {
  if (!logoUrl || countProjectsUsingLogo(logoUrl) > 0) return;

  try {
    await deleteLogoByUrl(logoUrl);
  } catch (error) {
    console.warn('[logo cleanup] Unable to delete logo:', error.message);
  }
}

async function cleanupProjectLogos(project) {
  const urls = new Set([project.logoUrl, project.logoSourceUrl].filter(Boolean));
  for (const logoUrl of urls) await cleanupOrphanedLogo(logoUrl);
}

export const getProjects = asyncHandler(async (req, res) => {
  const isAdmin = Boolean(req.admin);
  res.json({ success: true, data: listProjects({ isAdmin }) });
});

export const getProjectDetail = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const isAdmin = Boolean(req.admin);
  const project = getProjectBySlug(slug, { isAdmin });
  if (!project) throw httpError(404, 'Project not found');
  res.json({ success: true, data: project });
});

export const createProject = asyncHandler(async (req, res) => {
  const payload = validateProject(req.body);
  const project = createProjectRecord(payload);
  res.status(201).json({ success: true, data: project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Invalid project id');

  const currentProject = getProjectById(id, { isAdmin: true });
  if (!currentProject) throw httpError(404, 'Project not found');

  const payload = validateProject(req.body);
  const project = updateProjectRecord(id, payload);
  if (!project) throw httpError(404, 'Project not found');

  if (currentProject.logoUrl && currentProject.logoUrl !== project.logoUrl) {
    await cleanupProjectLogos(currentProject);
  }
  if (currentProject.logoSourceUrl && currentProject.logoSourceUrl !== project.logoSourceUrl) {
    await cleanupOrphanedLogo(currentProject.logoSourceUrl);
  }

  res.json({ success: true, data: project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Invalid project id');

  const currentProject = getProjectById(id, { isAdmin: true });
  if (!currentProject) throw httpError(404, 'Project not found');

  const deleted = deleteProjectRecord(id);
  if (!deleted) throw httpError(404, 'Project not found');

  await cleanupProjectLogos(currentProject);

  res.json({ success: true, data: { id } });
});
