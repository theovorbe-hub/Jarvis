import bcrypt from "bcryptjs";

// Split out from auth.ts so the Edge-runtime middleware (which only needs
// JWT verification) never bundles bcryptjs, whose Node-only internals
// (process.nextTick, setImmediate) aren't available there.
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
