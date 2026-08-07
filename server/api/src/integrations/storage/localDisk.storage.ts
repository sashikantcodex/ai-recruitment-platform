import fs from "fs";
import path from "path";
import { env } from "../../config/config.ts";
import type { StoragePort, UploadedObject } from "./storage.port.ts";

/** Local disk adapter mimicking S3 object storage for local/dev/Docker. */
export class LocalDiskStorage implements StoragePort {
  private root: string;

  constructor(root = path.resolve(process.cwd(), env.UPLOAD_DIR)) {
    this.root = root;
    fs.mkdirSync(this.root, { recursive: true });
  }

  async upload(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder?: string;
  }): Promise<UploadedObject> {
    const folder = input.folder ?? "resumes";
    const dir = path.join(this.root, folder);
    fs.mkdirSync(dir, { recursive: true });
    const safe = input.originalName.replace(/[^\w.\-]+/g, "_");
    const key = `${folder}/${Date.now()}-${safe}`;
    const full = path.join(this.root, key);
    fs.writeFileSync(full, input.buffer);
    return {
      key,
      path: full,
      url: `file://${full}`,
      mimeType: input.mimeType,
      size: input.buffer.length,
    };
  }

  async getSignedUrl(key: string, _expiresSeconds = 3600): Promise<string> {
    const full = path.join(this.root, key);
    return `file://${full}`;
  }

  async delete(key: string): Promise<void> {
    const full = path.join(this.root, key);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }
}

export function createStorage(): StoragePort {
  // S3 adapter can be swapped in when STORAGE_DRIVER=s3 without changing callers.
  return new LocalDiskStorage();
}
