import multer from "multer";

/**
 * Upload middleware
 * - Simpan file di memory (bukan local)
 * - Cocok untuk Cloudinary & Vercel (vercel tidak support file system)
 * - Cloudinary langsung upload dari buffer
 */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});
