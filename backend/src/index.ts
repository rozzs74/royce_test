import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './server/api/root.js';
import { createTRPCContext } from './server/api/trpc.js';
import { initializeDatabase } from './server/db/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database tables
initializeDatabase().catch(console.error);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
console.log('Uploads directory:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory at:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('Uploading file:', file.originalname, 'Type:', file.mimetype);
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed') as any, false);
    }
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uploadsDir: uploadsDir,
    nodeEnv: process.env.NODE_ENV
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('cv'), (req, res) => {
  console.log('Upload endpoint hit');
  console.log('File:', req.file);
  console.log('Body:', req.body);
  
  if (!req.file) {
    console.log('No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Return the absolute path instead of the relative path
  const absolutePath = path.resolve(req.file.path);
  
  const response = {
    filename: req.file.filename,
    path: absolutePath, // This should be the absolute path
    url: `/uploads/${req.file.filename}`,
    size: req.file.size
  };
  
  console.log('Upload successful:', response);
  res.json(response);
});

// Error handling for multer
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('Error in multer:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// tRPC middleware
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  })
);

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.path);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Upload endpoint available at: http://localhost:${PORT}/api/upload`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
  console.log(`Uploads directory: ${uploadsDir}`);
}); 