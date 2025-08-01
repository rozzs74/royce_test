import { createTRPCRouter } from './trpc.js';
import { cvRouter } from './routers/cv.js';

export const appRouter = createTRPCRouter({
  cv: cvRouter,
});

export type AppRouter = typeof appRouter; 