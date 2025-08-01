import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc.js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const cvSubmissionSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  experience: z.string().min(1, "Experience is required"),
  pdfPath: z.string(),
});

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
        
        // Read and parse PDF
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(pdfBuffer);
        const pdfText = pdfData.text;
        
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
        throw new Error(`Failed to process CV submission: ${error.message}`);
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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a CV validation assistant. Compare form data with CV content and return structured JSON responses."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error('AI validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate CV with AI',
      details: {},
    };
  }
} 