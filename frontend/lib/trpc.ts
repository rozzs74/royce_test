import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../backend/src/server/api/root';

export const api = createTRPCReact<AppRouter>();

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  return 'http://localhost:3001';
}

export const trpcClient = api.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        return {
          'content-type': 'application/json',
        };
      },
    }),
  ],
}); 