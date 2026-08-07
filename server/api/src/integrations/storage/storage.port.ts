/** Storage port — S3-shaped interface with local disk default. */
export type UploadedObject = {
  key: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
};

export interface StoragePort {
  upload(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder?: string;
  }): Promise<UploadedObject>;
  getSignedUrl(key: string, expiresSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
