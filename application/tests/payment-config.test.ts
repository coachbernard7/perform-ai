import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../lib/payment-config.ts", import.meta.url), "utf8");

describe("merchant payment configuration", () => {
  it("contains the supplied EVM and TRON destinations", () => {
    expect(source).toContain("0x64B637D97d9d9844212aAeA4eb981DBc3E3f3eB6");
    expect(source).toContain("TFStsK6YQunN2jv9TXubFa73tc42bWrXs3");
  });

  it("uses explicit Trust Wallet asset identifiers and explorers", () => {
    expect(source).toContain("asset=c20000714");
    expect(source).toContain("asset=c60");
    expect(source).toContain("asset=c195_tTR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
    expect(source).toContain("bscscan.com/address");
    expect(source).toContain("etherscan.io/address");
    expect(source).toContain("tronscan.org/#/address");
  });

  it("contains the supplied Revolut link and a same-origin web proof endpoint", () => {
    expect(source).toContain("https://revolut.me/coachbernard");
    expect(source).toContain('platform==="web"?"/app/submit-payment.php":""');
  });
});
