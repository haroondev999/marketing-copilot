import CryptoJS from "crypto-js";
import { env } from "./env";

const SECRET_KEY = env.ENCRYPTION_KEY;

export function encrypt(data: Record<string, string>): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

export function decrypt(encrypted: string): Record<string, string> {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt credentials");
  }
}
