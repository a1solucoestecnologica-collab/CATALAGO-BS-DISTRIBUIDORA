import { createHmac, timingSafeEqual } from "crypto";

export function verifyBlingWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.BLING_CLIENT_SECRET?.trim();
  if (!secret) return false;
  if (!signatureHeader?.trim()) return false;

  const expected =
    "sha256=" +
    createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const received = signatureHeader.trim();
  if (expected.length !== received.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(received, "utf8"),
    );
  } catch {
    return false;
  }
}
