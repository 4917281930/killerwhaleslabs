import { saveLogoDataUrl } from '../services/logoStorageService.js';

export async function uploadLogo(req, res) {
  const data = await saveLogoDataUrl({
    imageData: req.body?.imageData,
    projectName: req.body?.projectName
  });

  res.status(201).json({ success: true, data });
}
