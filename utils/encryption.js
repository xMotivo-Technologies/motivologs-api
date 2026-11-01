const crypto = require("crypto");

// Encrypts delivered account credentials at rest (AES-256-GCM) — these are
// real email:password pairs, not something to ever store as plain text.
// LOGS_ENCRYPTION_KEY must be a 32-byte key, hex-encoded (64 hex chars).
const ALGORITHM = "aes-256-gcm";

const getKey = () => {
  const hex = process.env.LOGS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("LOGS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
};

const encrypt = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // iv:authTag:ciphertext, all hex — one string, easy to store in Mongo.
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

const decrypt = (payload) => {
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
};

module.exports = { encrypt, decrypt };
