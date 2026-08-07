import { describe, expect, it, vi, beforeEach } from "vitest";

const use = vi.fn();
const create = vi.fn(() => ({
  interceptors: { request: { use } },
  defaults: { headers: {} },
}));

vi.mock("axios", () => ({
  default: { create },
}));

vi.mock("../utils/storage", () => ({
  storage: {
    getAccessToken: vi.fn(() => "token-abc"),
  },
}));

describe("http.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    use.mockReset();
    create.mockClear();
  });

  it("attaches bearer token and clears FormData content-type", async () => {
    await import("./http.service");
    expect(create).toHaveBeenCalled();
    const interceptor = use.mock.calls[0][0];
    const config = {
      headers: { Authorization: undefined as string | undefined, "Content-Type": "application/json" },
      data: new FormData(),
    };
    const next = interceptor(config);
    expect(next.headers.Authorization).toBe("Bearer token-abc");
    expect(next.headers["Content-Type"]).toBeUndefined();
  });
});
