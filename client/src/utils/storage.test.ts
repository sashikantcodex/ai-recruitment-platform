import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "./storage";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and clears tokens/user", () => {
    storage.setTokens("a", "r");
    expect(storage.getAccessToken()).toBe("a");
    expect(storage.getRefreshToken()).toBe("r");
    storage.setUser({ id: "u1" });
    expect(storage.getUser<{ id: string }>()).toEqual({ id: "u1" });
    storage.clear();
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
  });
});
