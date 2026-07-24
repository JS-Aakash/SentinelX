import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
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

// Local Disk Storage for IPFS Evidence Uploads (Images, PDFs, Documents, Videos)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const uploadDisk = multer({
  storage: localStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// Local Disk Storage for 3D Digital Twin Models (.glb, .gltf, .fbx, .obj)
const digitalTwinsDir = path.join(uploadsDir, 'digital-twins');
if (!fs.existsSync(digitalTwinsDir)) {
  fs.mkdirSync(digitalTwinsDir, { recursive: true });
}

const digitalTwinStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, digitalTwinsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'digital-twin-' + uniqueSuffix + ext);
  },
});

const digitalTwinFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExts = ['.glb', '.gltf', '.fbx', '.obj'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid file format ${ext}. Allowed formats: GLB, GLTF, FBX, OBJ`));
  }
};

export const uploadDigitalTwin = multer({
  storage: digitalTwinStorage,
  fileFilter: digitalTwinFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

