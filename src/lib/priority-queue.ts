// src/lib/priority-queue.ts

type Task = {
  id: string;
  isPro: boolean;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

class PriorityScheduler {
  private queue: Task[] = [];
  private activeCount = 0;
  private maxConcurrency = 5; // Allow 5 concurrent resource-heavy operations

  async enqueue<T>(execute: () => Promise<T>, isPro: boolean): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: Task = {
        id: Math.random().toString(36).substring(7),
        isPro,
        execute,
        resolve,
        reject,
      };

      if (isPro) {
        // Insert PRO users at the front of the queue
        // But behind other PRO users who are already waiting
        const firstNonProIndex = this.queue.findIndex((t) => !t.isPro);
        if (firstNonProIndex === -1) {
          this.queue.push(task);
        } else {
          this.queue.splice(firstNonProIndex, 0, task);
        }
      } else {
        // Free/Guest users go to the back of the queue
        this.queue.push(task);
      }

      this.processNext();
    });
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    this.activeCount++;

    try {
      const result = await task.execute();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }
}

export const priorityScheduler = new PriorityScheduler();
