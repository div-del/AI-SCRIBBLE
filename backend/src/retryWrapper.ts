// src/retryWrapper.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 300
): Promise<T> {
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`Retry attempt ${i + 1} failed:`, err);

      // wait before retry
      if (i < retries) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  throw lastError;
}
