import { saveLogoDataUrl } from '../services/logoStorageService.js';
import { asyncHandler } from '../utils/errors.js';

export const uploadLogo = asyncHandler(async (req, res) => {
  const data = await saveLogoDataUrl({
    imageData: req.body?.imageData,
    projectName: req.body?.projectName
  });

  res.status(201).json({ success: true, data });
});
