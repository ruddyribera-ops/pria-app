/**
 * upload.ts — Shared file upload middleware for PRIA v10 server.
 * WARNING: Railway ephemeral filesystem — files vanish on redeploy. Migrate to Railway Blob for persistence.
 */
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Files stored relative to server root (works locally; ephemeral on Railway)
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const MATERIALS_DIR = path.join(UPLOADS_DIR, 'materials');
const DIAG_DIR = path.join(UPLOADS_DIR, 'diagnosticos');

const ALLOWED_MATERIALS = ['.pdf', '.docx', '.txt', '.doc', '.pptx', '.xlsx'];
const ALLOWED_DIAG = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.doc'];

function makeDiskStorage(subDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, subDir),
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const name = file.fieldname + '-' + ts + '-' + Math.random().toString(36).slice(2, 8) + ext;
      cb(null, name);
    },
  });
}

const materialFilter = (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MATERIALS.includes(ext)) cb(null, true);
  else cb(new Error(`Tipo no permitido: ${ext}`));
};

const diagFilter = (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_DIAG.includes(ext)) cb(null, true);
  else cb(new Error(`Tipo no permitido: ${ext}`));
};

export const uploadMaterial = multer({
  storage: makeDiskStorage(MATERIALS_DIR),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: materialFilter,
});

export const uploadDiagnostico = multer({
  storage: makeDiskStorage(DIAG_DIR),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: diagFilter,
});

export { UPLOADS_DIR };
