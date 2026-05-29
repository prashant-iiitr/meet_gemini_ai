 import { initTRPC,TRPCError } from '@trpc/server';
import { cache } from 'react';
 import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
export const createTRPCContext = cache(async () => {
  // build a context that includes the authenticated session when available
  const session = await auth.api.getSession({ headers: await headers() });
  return { auth: session };
});
 
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
export type CreateTRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<CreateTRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});
 
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

export const protectedProcedure = baseProcedure.use(enforceAuth);