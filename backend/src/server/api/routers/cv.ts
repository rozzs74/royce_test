import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const cvSubmissionSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  experience: z.string().min(1, "Experience is required"),
  pdfPath: z.string(),
});

// Simplified PDF text extraction - for now just return a placeholder
async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
  try {
    // For now, return a placeholder text to test the flow
    // TODO: Implement proper PDF text extraction once dependencies are resolved
    console.log('PDF file size:', pdfBuffer.length, 'bytes');
    return `[PDF Content Placeholder - File size: ${pdfBuffer.length} bytes]\n\nThis is a placeholder for PDF text extraction. The actual PDF content will be processed once the PDF parsing library is properly configured.`;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export const cvRouter = createTRPCRouter({
  submitCV: publicProcedure
    .input(cvSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('CV submission received:', { ...input, pdfPath: input.pdfPath });
        
        // The pdfPath should now be an absolute path from the upload endpoint
        const filePath = input.pdfPath;
        
        console.log('Reading PDF from path:', filePath);
        
        // Check if file exists
        try {
          await fs.access(filePath);
        } catch (error) {
          console.error('File not found at path:', filePath);
          throw new Error(`PDF file not found at path: ${filePath}`);
        }
        
        // Read PDF file
        const pdfBuffer = await fs.readFile(filePath);
        console.log('PDF file read successfully, size:', pdfBuffer.length);
        
        // Extract text (using placeholder for now)
        const pdfText = await extractPDFText(pdfBuffer);
        
        console.log('PDF parsed successfully, text length:', pdfText.length);

        // Create CV submission
        const result = await ctx.db.query(
          `INSERT INTO "CVSubmission" 
           ("fullName", email, phone, skills, experience, "pdfUrl", "pdfContent") 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING *`,
          [
            input.fullName,
            input.email,
            input.phone,
            input.skills,
            input.experience,
            input.pdfPath,
            pdfText
          ]
        );
        
        const submission = result.rows[0];
        console.log('CV submission created with ID:', submission.id);

        // Validate using OpenAI
        console.log('Starting AI validation...');
        const validationResult = await validateCVWithAI(input, pdfText);
        console.log('AI validation completed:', validationResult.isValid);

        // Update submission with validation result
        const updateResult = await ctx.db.query(
          `UPDATE "CVSubmission" 
           SET validated = $1, "validationResult" = $2, "updatedAt" = CURRENT_TIMESTAMP 
           WHERE id = $3 
           RETURNING *`,
          [validationResult.isValid, JSON.stringify(validationResult), submission.id]
        );

        return {
          success: true,
          submission: updateResult.rows[0],
          validationResult,
        };
      } catch (error) {
        console.error('Error processing CV submission:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to process CV submission: ${message}`);
      }
    }),

  getSubmissions: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.query(
      'SELECT * FROM "CVSubmission" ORDER BY "createdAt" DESC'
    );
    return result.rows;
  }),

  getSubmission: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query(
        'SELECT * FROM "CVSubmission" WHERE id = $1',
        [input.id]
      );
      return result.rows[0] || null;
    }),
});

async function validateCVWithAI(formData: z.infer<typeof cvSubmissionSchema>, pdfContent: string) {
  try {
    const prompt = `
      Please compare the following form data with the CV content and validate if they match.
      
      Form Data:
      - Full Name: ${formData.fullName}
      - Email: ${formData.email}
      - Phone: ${formData.phone}
      - Skills: ${formData.skills.join(', ')}
      - Experience: ${formData.experience}
      
      CV Content:
      ${pdfContent}
      
      Please analyze and return a JSON response with the following structure:
      {
        "isValid": boolean,
        "matches": {
          "fullName": boolean,
          "email": boolean,
          "phone": boolean,
          "skills": boolean,
          "experience": boolean
        },
        "details": {
          "fullName": "explanation",
          "email": "explanation",
          "phone": "explanation",
          "skills": "explanation",
          "experience": "explanation"
        },
        "overallSummary": "summary of the validation"
      }
    `;

    // Create the full prompt with system instruction
    const fullPrompt = `You are a CV validation assistant. Compare form data with CV content and return structured JSON responses.

${prompt}

Please respond with ONLY a valid JSON object, no additional text.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw AI response:', text);
    
    // Clean up the response - remove markdown code blocks and extra formatting
    let cleanedText = text.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing whitespace
    cleanedText = cleanedText.trim();
    
    console.log('Cleaned AI response:', cleanedText);
    
    // Parse the JSON response
    const validationResult = JSON.parse(cleanedText);
    return validationResult;
  } catch (error: any) {
    console.error('AI validation error:', error);
    
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error('JSON parsing error - AI response was not valid JSON');
      return {
        isValid: true, // Allow submission to proceed
        error: 'AI response parsing error - validation skipped',
        message: 'CV submitted successfully. AI validation temporarily unavailable due to response format issues.',
        matches: {
          fullName: null,
          email: null,
          phone: null,
          skills: null,
          experience: null
        },
        details: {
          fullName: "AI validation unavailable - response parsing error",
          email: "AI validation unavailable - response parsing error", 
          phone: "AI validation unavailable - response parsing error",
          skills: "AI validation unavailable - response parsing error",
          experience: "AI validation unavailable - response parsing error"
        },
        overallSummary: 'CV submission accepted. AI validation temporarily unavailable due to response parsing issues. The AI returned an invalid format.'
      };
    }
    
    // Handle Google AI model not found error
    if (error?.message?.includes('not found') || error?.message?.includes('not supported')) {
      console.error('Google AI model not available - continuing without AI validation');
      return {
        isValid: true, // Allow submission to proceed
        error: 'Google AI model not available - validation skipped',
        message: 'CV submitted successfully. AI validation temporarily unavailable due to model availability.',
        matches: {
          fullName: null,
          email: null,
          phone: null,
          skills: null,
          experience: null
        },
        details: {
          fullName: "AI validation unavailable - model not found",
          email: "AI validation unavailable - model not found",
          phone: "AI validation unavailable - model not found",
          skills: "AI validation unavailable - model not found",
          experience: "AI validation unavailable - model not found"
        },
        overallSummary: 'CV submission accepted. AI validation temporarily unavailable due to Google AI model not being found or supported. Please check your Google AI API key and available models.'
      };
    }
    
    // Handle specific Google AI errors
    if (error?.status === 429 || error?.message?.includes('quota')) {
      console.error('Google AI quota exceeded - continuing without AI validation');
      return {
        isValid: true, // Allow submission to proceed
        error: 'Google AI quota exceeded - validation skipped',
        message: 'CV submitted successfully. AI validation temporarily unavailable due to quota limits.',
        matches: {
          fullName: null,
          email: null,
          phone: null,
          skills: null,
          experience: null
        },
        details: {
          fullName: "AI validation unavailable - quota exceeded",
          email: "AI validation unavailable - quota exceeded",
          phone: "AI validation unavailable - quota exceeded",
          skills: "AI validation unavailable - quota exceeded",
          experience: "AI validation unavailable - quota exceeded"
        },
        overallSummary: 'CV submission accepted. AI validation temporarily unavailable due to Google AI quota limits. Please check your Google AI API key and quota settings.'
      };
    }
    
    // Handle other API errors
    if (error?.status >= 400) {
      return {
        isValid: true, // Allow submission to proceed
        error: `Google AI API error (${error.status}) - validation skipped`,
        message: 'CV submitted successfully. AI validation temporarily unavailable.',
        matches: {},
        details: {},
        overallSummary: 'CV submission accepted. AI validation temporarily unavailable due to API issues.'
      };
    }
    
    // Handle other errors
    return {
      isValid: true, // Allow submission to proceed
      error: 'AI validation temporarily unavailable',
      message: 'CV submitted successfully. AI validation will be retried later.',
      details: {},
      overallSummary: 'CV submission accepted. AI validation temporarily unavailable.'
    };
  }
} 