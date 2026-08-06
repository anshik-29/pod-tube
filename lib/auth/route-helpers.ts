/**
 * Helper function to extract params from Next.js route context
 * Handles both sync and async params (Next.js 14+)
 */
export async function getParams<T extends Record<string, string>>(
  context?: { params?: Promise<T> | T }
): Promise<T> {
  if (!context?.params) {
    throw new Error('Params not found in context');
  }
  
  return context.params instanceof Promise 
    ? await context.params 
    : context.params;
}
