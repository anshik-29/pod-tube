/**
 * Storage abstraction layer
 * Allows swapping between local filesystem and S3-compatible storage
 */

export interface StorageProvider {
  /**
   * Save a file to storage
   * @param path Logical path (e.g., "sessions/123/host/video.webm")
   * @param data File data (Buffer or stream)
   * @returns Promise resolving when file is saved
   */
  save(path: string, data: Buffer | NodeJS.ReadableStream): Promise<void>;

  /**
   * Read a file from storage
   * @param path Logical path
   * @returns Promise resolving to file data as Buffer
   */
  read(path: string): Promise<Buffer>;

  /**
   * Check if a file exists
   * @param path Logical path
   * @returns Promise resolving to boolean
   */
  exists(path: string): Promise<boolean>;

  /**
   * Delete a file from storage
   * @param path Logical path
   * @returns Promise resolving when file is deleted
   */
  delete(path: string): Promise<void>;

  /**
   * Get a readable stream for a file
   * @param path Logical path
   * @returns Promise resolving to readable stream
   */
  getStream(path: string): Promise<NodeJS.ReadableStream>;

  /**
   * Get the full URL or path for downloading/accessing a file
   * @param path Logical path
   * @returns Promise resolving to URL or path string
   */
  getUrl(path: string): Promise<string>;

  /**
   * Get a presigned URL for direct client-to-storage uploads
   * @param path Logical path for the upload destination
   * @param expiresInSeconds How long the URL is valid (default 3600)
   * @returns Promise resolving to presigned upload URL, or null if not supported
   */
  getPresignedUploadUrl?(path: string, expiresInSeconds?: number): Promise<string>;
}
