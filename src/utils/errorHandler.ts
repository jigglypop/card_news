import { Logger } from './logger';

export async function tryCatch<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  fallback?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    Logger.error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    if (fallback !== undefined) return fallback;
    throw error;
  }
}
export async function tryCatchSync<T>(
  operation: () => T,
  errorMessage: string,
  fallback?: T
): Promise<T> {
  try {
    return operation();
  } catch (error) {
    Logger.error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    if (fallback !== undefined) return fallback;
    throw error;
  }
} 