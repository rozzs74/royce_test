import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Validate required database environment variables
const requiredEnvVars = ['DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_HOST', 'DATABASE_NAME'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please configure your database connection environment variables.');
  process.exit(1);
}

console.log(`Connecting to database: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT || '6543'}/${process.env.DATABASE_NAME}`);

export const db = new Pool({
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '6543'),
  database: process.env.DATABASE_NAME,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
db.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to Supabase database:', err.stack);
    console.error('Make sure your DATABASE_URL is correct and includes the pooler endpoint.');
  } else {
    console.log('Connected to Supabase PostgreSQL database');
    release();
  }
});

// Helper function to create tables if they don't exist
export async function initializeDatabase() {
  try {
    // First, check if the extension is available (Supabase should have it)
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS "CVSubmission" (
        id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
        "fullName" TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        skills TEXT[] NOT NULL,
        experience TEXT NOT NULL,
        "pdfUrl" TEXT NOT NULL,
        "pdfContent" TEXT,
        validated BOOLEAN DEFAULT false,
        "validationResult" JSONB,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Create an index for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_cvsubmission_createdat 
      ON "CVSubmission" ("createdAt" DESC);
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't exit, just log the error - tables might already exist
  }
} 