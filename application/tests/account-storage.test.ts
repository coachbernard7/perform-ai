import { describe, expect, it } from "vitest";
import { rehearsalStorageKey, LEGACY_STORAGE_KEY } from "../lib/account-storage";
describe("account storage boundaries", () => {
  it("keeps guest history unassigned and separates even encoded account IDs", () => {
    const keys=[rehearsalStorageKey(null),rehearsalStorageKey("alice"),rehearsalStorageKey("bob"),rehearsalStorageKey("a/b"),rehearsalStorageKey("a%2Fb")];
    expect(keys[0]).toBe(LEGACY_STORAGE_KEY);expect(new Set(keys).size).toBe(keys.length);
    expect(rehearsalStorageKey("alice")).not.toBe(LEGACY_STORAGE_KEY);
  });
});
