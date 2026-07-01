import { describe, expect, it } from "vitest";
import {
  extractWebhookEvent,
  extractWebhookProductId,
} from "@/services/catalog/bling-product-sync";

describe("bling-product-sync webhook parsing", () => {
  it("extrai evento do payload", () => {
    expect(
      extractWebhookEvent({ event: "product.updated", data: { id: 1 } }),
    ).toBe("product.updated");
    expect(extractWebhookEvent({ topic: "stock.updated" })).toBe(
      "stock.updated",
    );
  });

  it("extrai id do produto", () => {
    expect(
      extractWebhookProductId({ data: { id: 42 } }),
    ).toBe("42");
    expect(
      extractWebhookProductId({ data: { produto: { id: 99 } } }),
    ).toBe("99");
    expect(extractWebhookProductId({ data: {} })).toBeNull();
  });
});
