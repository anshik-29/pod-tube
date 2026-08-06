/**
 * Chunked file upload with resumable support
 */

export interface ChunkedUploadOptions {
  chunkSize?: number;
  onProgress?: (progress: number) => void;
  sessionId: string;
  participantType: 'host' | 'guest';
}

export class ChunkedUploader {
  private chunkSize: number;
  private sessionId: string;
  private participantType: 'host' | 'guest';
  private onProgress?: (progress: number) => void;

  constructor(options: ChunkedUploadOptions) {
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB default
    this.sessionId = options.sessionId;
    this.participantType = options.participantType;
    this.onProgress = options.onProgress;
  }

  async uploadFile(file: File): Promise<string> {
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    let uploadedBytes = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('sessionId', this.sessionId);
      formData.append('participantType', this.participantType);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());

      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed at chunk ${chunkIndex}`);
      }

      uploadedBytes += chunk.size;
      const progress = (uploadedBytes / file.size) * 100;
      this.onProgress?.(progress);
    }

    // Finalize upload
    const finalizeResponse = await fetch('/api/upload/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        participantType: this.participantType,
        totalChunks,
      }),
    });

    if (!finalizeResponse.ok) {
      throw new Error('Failed to finalize upload');
    }

    const data = await finalizeResponse.json();
    return data.file_reference;
  }
}
