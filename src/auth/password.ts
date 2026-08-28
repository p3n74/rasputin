import { hash, verify } from "@node-rs/argon2";

const argon2opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, argon2opts);
}

export async function verifyPassword(
  hashed: string,
  password: string,
): Promise<boolean> {
  return verify(hashed, password);
}
