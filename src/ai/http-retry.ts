import { AIProviderError } from "./provider";

export interface RetryOptions {
  maxRetries: number;
}

export async function exponentialBackoff(attempt: number): Promise<void> {
  await new Promise((r) =>
    setTimeout(r, 1000 * Math.pow(2, attempt) + Math.random() * 500),
  );
}

export async function withRetry<T>(
  attempt: (attemptNumber: number) => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  let lastErr: Error | null = null;
  for (let att = 0; att <= opts.maxRetries; att++) {
    try {
      return await attempt(att);
    } catch (err) {
      if (err instanceof AIProviderError) {
        if (!err.retryable) throw err;
        lastErr = err;
      } else if (err instanceof DOMException && err.name === "AbortError") {
        lastErr = new AIProviderError("Timeout", true);
      } else {
        lastErr = new AIProviderError(
          `Failed: ${err instanceof Error ? err.message : String(err)}`,
          true,
        );
      }
      await exponentialBackoff(att);
    }
  }
  throw lastErr ?? new AIProviderError("Failed after retries", false);
}
