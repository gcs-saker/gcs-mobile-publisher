import type { WakeLockPort } from "../../../app/ports";

export class WakeLockController {
  private activeLock: WakeLockSentinel | null = null;
  private generation = 0;

  async acquire(port: WakeLockPort): Promise<void> {
    await this.release();
    const generation = ++this.generation;
    const lock = await port.request();
    if (generation !== this.generation) {
      await lock?.release();
      return;
    }
    this.activeLock = lock;
  }

  async release(): Promise<void> {
    this.generation += 1;
    const lock = this.activeLock;
    this.activeLock = null;
    await lock?.release();
  }
}
