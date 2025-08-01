# CV Validator Application

A full-stack application that allows users to submit their CV information through a form and upload a PDF, then validates the form data against the PDF content using AI.

## 🚀 Quick Start - How to Run

### Option 1: Using Docker with Makefile (Easiest)

```bash
# 1. Ensure Docker Desktop is running
# 2. Ensure .env.config file exists with your API keys
# 3. Run:
make up

# Or to see logs:
make dev
```

See all available commands with `make help`.

### Option 2: Docker Compose Directly

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 3: Manual Setup

```bash
# 1. Install dependencies
cd frontend && npm install
cd ../backend && npm install

# 2. Create .env.config file (see below)

# 3. Start both services (in separate terminals)
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

### Required Environment Variables

Create a `.env.config` file in the root directory:

```env
# Database Configuration (Supabase)
DATABASE_HOST=your-supabase-host
DATABASE_PORT=6543
DATABASE_USER=your-database-user
DATABASE_PASSWORD=your-database-password
DATABASE_NAME=postgres

# API Keys
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Environment
ENVIRONMENT=development
```

## 📋 Makefile Commands

The project includes a Makefile for easy management:

```bash
# Core Commands
make up              # Start the application
make down            # Stop the application
make restart         # Restart services
make dev             # Start and show logs

# Logs
make logs            # Show all logs
make logs-backend    # Show backend logs only
make logs-frontend   # Show frontend logs only

# Maintenance
make build           # Build Docker images
make rebuild         # Clean rebuild
make clean           # Remove everything
make db-reset        # Reset database

# Utilities
make ps              # Show running containers
make shell-backend   # Open backend shell
make shell-frontend  # Open frontend shell

# Checks
make check           # Run all checks
make help            # Show all commands
```

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, tRPC, TypeScript
- **Database**: PostgreSQL with Prisma ORM (or Supabase)
- **AI Integration**: OpenAI API for CV validation
- **File Storage**: Local filesystem with multer
- **Containerization**: Docker & Docker Compose

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Next.js Frontend                      │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │   CV Form   │  │ File Upload  │  │  Validation  │  │  │
│  │  │  Component  │  │   Dropzone   │  │   Display    │  │  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘  │  │
│  │                                                         │  │
│  │                    tRPC Client                          │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/tRPC
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Server                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Express + tRPC                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ File Upload  │  │ CV Submission│  │      AI      │  │  │
│  │  │   Endpoint   │  │   Router     │  │  Validation  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────┐                    ┌─────────────────┐   │
│  │   Prisma ORM    │                    │  Google AI API  │   │
│  └─────────────────┘                    └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │                                        │
           │                                        │
           ▼                                        ▼
┌─────────────────────┐                  ┌─────────────────────┐
│    PostgreSQL DB    │                  │  External Service   │
│  ┌───────────────┐  │                  │                     │
│  │ CVSubmission  │  │                  │  Gemini 1.5 Flash  │
│  │    Table      │  │                  │                     │
│  └───────────────┘  │                  └─────────────────────┘
└─────────────────────┘
```

## Features

- **Form Data Entry**: Users can enter their personal information including:
  - Full name
  - Email
  - Phone number
  - Skills (comma-separated)
  - Experience description

- **PDF Upload**: Drag-and-drop or click to upload CV in PDF format

- **AI Validation**: Compares form data with PDF content using Google Generative AI (Gemini 1.5 Flash)
  - Validates each field individually
  - Provides detailed match/mismatch information
  - Shows overall validation summary
  - Graceful fallback when AI is unavailable

- **Data Persistence**: All submissions are stored in PostgreSQL database

## Troubleshooting

### Google AI API Issues

If you see "models/gemini-pro is not found" or similar errors:

1. **Get your API key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Create a new API key** and copy it
3. **Add to your environment**: Set `GOOGLE_AI_API_KEY` in your `.env.config` file
4. **Check model availability**: The app uses `gemini-1.5-flash` model
5. **Verify your account**: Make sure your Google AI account is set up and has access to Gemini models

If AI validation fails, the app will continue working without AI validation and save your CV submission.

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm (or Node.js 16+ with modified dependencies)
- PostgreSQL database (local or Supabase)
- OpenAI API key
- Docker Desktop (for containerized deployment)

### Option 1: Using Supabase with Docker (Recommended)

1. **Create a Supabase Project**
   - Sign up at https://supabase.com
   - Create a new project
   - Get your database credentials from Settings → Database

2. **Configure Environment Variables**
   Create a `.env.config` file in the root directory with your Supabase credentials

3. **Run with Docker**
   ```bash
   # Using Makefile
   make up
   
   # Or using docker-compose directly
   docker-compose up -d
   ```

### Option 2: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cv-validator
   ```

2. **Install dependencies**
   ```bash
   # Using Makefile
   make install
   
   # Or manually
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Set up environment variables**
   Create a `.env.config` file in the root directory

4. **Start PostgreSQL** (if using local database)
   ```bash
   docker run -d \
     --name cv-postgres \
     -e POSTGRES_USER=user \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=cv_validator \
     -p 5432:5432 \
     postgres:15-alpine
   ```

5. **Start the development servers**
   ```bash
   # Using Makefile
   make dev
   
   # Or manually in separate terminals
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

   This will start:
   - Frontend at http://localhost:3000
   - Backend at http://localhost:3001

### Production Deployment with Docker

1. **Set up environment variables**
   Ensure your `.env.config` file has production values

2. **Build and run with Docker Compose**
   ```bash
   # Using Makefile
   make rebuild
   
   # Or using docker-compose
   docker-compose up -d --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## API Endpoints

### tRPC Procedures

- `cv.submitCV`: Submit CV data and validate against PDF
  - Input: Form data + PDF file path
  - Output: Validation result with detailed field matching

- `cv.getSubmissions`: Get all CV submissions
  - Output: List of all submissions with validation status

- `cv.getSubmission`: Get a specific submission by ID
  - Input: Submission ID
  - Output: Full submission details

### REST Endpoints

- `POST /api/upload`: Upload PDF file
  - Input: Multipart form data with PDF file
  - Output: File path and URL

## Database Schema

```sql
CREATE TABLE "CVSubmission" (
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
```

## Troubleshooting

### Using Makefile Commands

```bash
# Check environment and Docker setup
make check

# View logs for debugging
make logs-backend
make logs-frontend

# Rebuild if having issues
make rebuild

# Reset database if needed
make db-reset

# Clean everything and start fresh
make clean
make up
```

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml if 3000/3001 are in use
2. **Database connection**: Ensure DATABASE_URL is correct in .env.config
3. **Docker not running**: Start Docker Desktop before running commands
4. **Dependencies issues**: Run `make rebuild` for a clean build

## Challenges and Solutions

### 1. File Upload Handling
**Challenge**: Integrating file uploads with tRPC, which doesn't natively support multipart data.
**Solution**: Created a separate Express endpoint for file uploads that works alongside tRPC.

### 2. PDF Content Extraction
**Challenge**: Extracting text content from PDF files for AI validation.
**Solution**: Used `pdf-parse` library to extract text content from uploaded PDFs.

### 3. AI Validation Accuracy
**Challenge**: Ensuring accurate comparison between form data and CV content.
**Solution**: Structured prompts with clear JSON response format and field-by-field validation.

### 4. Type Safety Across Stack
**Challenge**: Maintaining type safety between frontend and backend.
**Solution**: Leveraged tRPC's automatic type inference from backend to frontend.

### 5. Docker Networking
**Challenge**: Ensuring services can communicate in Docker environment.
**Solution**: Used Docker Compose networking with service names for internal communication.

## Security Considerations

- File uploads are restricted to PDF only
- Uploaded files are stored in a dedicated directory
- Database credentials are environment-specific
- CORS is configured for the frontend origin only
- Input validation using Zod schemas

## Future Enhancements

1. **Authentication**: Add user authentication and authorization
2. **File Storage**: Integrate cloud storage (S3, GCS) for scalability
3. **Batch Processing**: Support multiple CV uploads
4. **Advanced AI**: Use more sophisticated AI models for better validation
5. **Export Features**: Generate validation reports in various formats
6. **Real-time Updates**: Add WebSocket support for live validation status

## Bonus: Deployment with Coolify

To deploy with Coolify:

1. Push your code to a Git repository
2. In Coolify, create a new project and connect your repository
3. Set up environment variables in Coolify's UI
4. Configure the docker-compose.yml as the deployment method
5. Deploy and configure a custom domain

## License

MIT License 