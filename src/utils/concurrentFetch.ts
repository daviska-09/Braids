// Runs at most `concurrency` tasks simultaneously using a worker-pool pattern.
// JavaScript is single-threaded so the index increment is safe without a mutex.
// Tasks that throw are captured as undefined rather than rejecting the whole batch.

export async function fetchWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 5
): Promise<(T | undefined)[]> {
  if (tasks.length === 0) return [];
  const results: (T | undefined)[] = new Array(tasks.length).fill(undefined);
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = await tasks[i]();
      } catch {
        results[i] = undefined;
      }
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}
