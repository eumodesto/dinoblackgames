import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const COST = 16384;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(password, salt, KEYLEN, { N: COST, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))));
}

/** Hash com sal aleatório: "scrypt$N$sal$hash". A senha nunca é guardada. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${COST}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || Number(cost) !== COST || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Senha provisória legível (sem caracteres que se confundem), no formato Dino-XXXX-XXXX. */
export function temporaryPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = (n: number) => Array.from(randomBytes(n), (b) => alphabet[b % alphabet.length]).join("");
  return `Dino-${pick(4)}-${pick(4)}`;
}

export const MIN_PASSWORD = 10;
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
  return null;
}
