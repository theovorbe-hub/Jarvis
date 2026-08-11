import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

export async function saveUpload(userId: string, filename: string, buffer: Buffer) {
  const dir = path.join(UPLOADS_DIR, userId);
  await fs.mkdir(dir, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = path.join(dir, `${uuidv4()}-${safeName}`);
  await fs.writeFile(storagePath, buffer);
  return storagePath;
}
