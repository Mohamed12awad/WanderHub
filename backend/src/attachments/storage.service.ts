import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * File storage abstraction. The current implementation writes to local disk
 * under UPLOAD_DIR; the interface (save/read/delete returning opaque keys) is
 * deliberately storage-agnostic so it can be swapped for S3 without touching
 * callers.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'uploads');

  /** Persists a buffer and returns an opaque storage key. */
  async save(buffer: Buffer, originalName: string): Promise<string> {
    const ext = path.extname(originalName).slice(0, 12);
    const key = `${new Date().getFullYear()}/${randomUUID()}${ext}`;
    const full = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return key;
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (err) {
      // A missing file shouldn't block deleting its DB row.
      this.logger.warn(`Failed to delete ${key}: ${(err as Error).message}`);
    }
  }

  /** Guards against path traversal in stored keys. */
  private resolve(key: string): string {
    const full = path.resolve(this.baseDir, key);
    if (!full.startsWith(this.baseDir)) throw new Error('Invalid storage key');
    return full;
  }
}
