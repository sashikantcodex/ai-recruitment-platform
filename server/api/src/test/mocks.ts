import { vi } from "vitest";

/** Mongoose-style thenable query chain (find/sort/populate). */
export function mockQuery<T>(result: T) {
  const q: {
    sort: ReturnType<typeof vi.fn>;
    populate: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    then: typeof Promise.prototype.then;
  } = {
    sort: vi.fn(),
    populate: vi.fn(),
    select: vi.fn(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  q.sort.mockReturnValue(q);
  q.populate.mockReturnValue(q);
  q.select.mockReturnValue(q);
  return q;
}

export function mockRes() {
  const res: {
    statusCode?: number;
    body?: unknown;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  } = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  res.send.mockImplementation((body?: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}
