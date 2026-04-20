import crypto from "crypto";
import CryptoJS from "crypto-js";
import { readServerEnv } from "@/lib/env";

export function deriveKeyFromPassword(password: string, salt?: string) {
  const saltToUse = salt ?? CryptoJS.lib.WordArray.random(128 / 8).toString();
  const key = CryptoJS.PBKDF2(password, saltToUse, {
    keySize: 256 / 32,
    iterations: 10_000,
  });

  return {
    key: key.toString(),
    salt: saltToUse,
  };
}

export function encryptData(plaintext: string, key: string) {
  return CryptoJS.AES.encrypt(plaintext, key).toString();
}

export function decryptData(ciphertext: string, key: string) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function encryptMasterKey(masterKey: string, userId: string) {
  const salt = readServerEnv("ENCRYPTION_SALT", {
    developmentFallback: "development-salt",
  });
  return encryptData(masterKey, `${userId}${salt}`);
}

export function decryptMasterKey(encryptedKey: string, userId: string) {
  const salt = readServerEnv("ENCRYPTION_SALT", {
    developmentFallback: "development-salt",
  });
  return decryptData(encryptedKey, `${userId}${salt}`);
}

export function generateAccessCode() {
  return crypto.randomBytes(16).toString("hex");
}
