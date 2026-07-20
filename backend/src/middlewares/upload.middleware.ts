import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Define Cloudinary Storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const folderMap: Record<string, string> = {
      logo: 'sentinelx/logos',
      avatar: 'sentinelx/avatars',
      machine: 'sentinelx/machines',
    };
    const folder = folderMap[file.fieldname] ?? 'sentinelx/uploads';
    return {
      folder,
      allowed_formats: ['jpeg', 'jpg', 'png', 'webp'],
      public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e5)}`,
      transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
    };
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter,
  limits: {
    fileSize: Number(env.MAX_FILE_SIZE), // 5MB
  },
});

