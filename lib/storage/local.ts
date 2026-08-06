import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { StorageProvider } from './types';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private baseDirInitialized: boolean = false;

  constructor(baseDir: string = './uploads') {
    this.baseDir = path.resolve(baseDir);
  }

  private async ensureBaseDir(): Promise<void> {
    if (this.baseDirInitialized) {
      return;
    }
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      console.log(`[Storage] Base directory ready: ${this.baseDir}`);
      this.baseDirInitialized = true;
    } catch (error) {
      console.error(`[Storage] Error ensuring base directory exists:`, error);
      throw error;
    }
  }

  private getFullPath(logicalPath: string): string {
    // Normalize path to prevent directory traversal
    const normalized = path.normalize(logicalPath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, normalized);
  }

  async save(filePath: string, data: Buffer | NodeJS.ReadableStream): Promise<void> {
    await this.ensureBaseDir();
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    if (Buffer.isBuffer(data)) {
      await fs.writeFile(fullPath, data);
    } else {
      const writeStream = createWriteStream(fullPath);
      return new Promise((resolve, reject) => {
        data.pipe(writeStream);
        data.on('end', resolve);
        data.on('error', reject);
        writeStream.on('error', reject);
      });
    }
  }

  async read(filePath: string): Promise<Buffer> {
    await this.ensureBaseDir();
    const fullPath = this.getFullPath(filePath);
    try {
      return await fs.readFile(fullPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`[Storage] File not found: ${filePath}`);
        console.error(`[Storage] Full path: ${fullPath}`);
        console.error(`[Storage] Base directory: ${this.baseDir}`);
        // Check if base directory exists
        try {
          const baseDirStats = await fs.stat(this.baseDir);
          console.error(`[Storage] Base directory exists: ${baseDirStats.isDirectory()}`);
        } catch (statError) {
          console.error(`[Storage] Base directory does not exist or is not accessible`);
        }
        throw new Error(`File not found: ${filePath} (resolved to: ${fullPath})`);
      }
      throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getStream(filePath: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.getFullPath(filePath);
    return createReadStream(fullPath);
  }

  async getUrl(filePath: string): Promise<string> {
    // For local storage, return a relative path that can be served via API
    return `/api/files/${encodeURIComponent(filePath)}`;
  }
}
