import { createHmac } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyBlingWebhookSignature } from "@/services/webhook/bling-webhook-signature";

const SECRET = "test-client-secret";

function sign(body: string): string {
  return (
    "sha256=" +
    createHmac("sha256", SECRET).update(body, "utf8").digest("hex")
  );
}

describe("verifyBlingWebhookSignature", () => {
  afterEach(() => {
    delete process.env.BLING_CLIENT_SECRET;
  });

  it("aceita assinatura HMAC válida", () => {
    process.env.BLING_CLIENT_SECRET = SECRET;
    const body = '{"event":"product.updated","data":{"id":123}}';
    expect(verifyBlingWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejeita assinatura inválida", () => {
    process.env.BLING_CLIENT_SECRET = SECRET;
    const body = '{"event":"product.updated"}';
    expect(verifyBlingWebhookSignature(body, "sha256=deadbeef")).toBe(false);
  });

  it("rejeita quando o secret não está configurado", () => {
    const body = '{"event":"product.updated"}';
    expect(verifyBlingWebhookSignature(body, sign(body))).toBe(false);
  });
});
