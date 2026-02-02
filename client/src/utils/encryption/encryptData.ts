import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY) {
  throw new Error("Please add an encryption key.");
}

//console.log("Length of encryption key:", ENCRYPTION_KEY.length);

if (Buffer.from(ENCRYPTION_KEY, "base64").length !== 32) {
  throw new Error("Please add an encryption key must be 32 bytes!");
}

//encrypt access_token & refresh_token before store on database
export function encryptData(data: string) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv
  );
  let encrypted = cipher.update(data);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}
