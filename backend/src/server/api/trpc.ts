import { initTRPC } from '@trpc/server';
import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { db } from '../db/index.js';

export const createTRPCContext = (opts: CreateExpressContextOptions) => {
  return {
    db,
    req: opts.req,
    res: opts.res,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure; 