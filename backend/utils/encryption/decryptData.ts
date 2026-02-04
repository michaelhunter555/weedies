import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";

//decrypt access_token & refresh_token before making requests to google
export function decryptData(data: string) {
  let text = data.split(":");
  let shiftedText = text.shift();

  if (!shiftedText) {
    throw new Error("Invalid data format");
  }

  let iv = Buffer.from(shiftedText, "hex");
  let encryptedText = Buffer.from(text.join(":"), "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv
  );
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}
