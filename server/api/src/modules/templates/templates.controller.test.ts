import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery, mockRes } from "../../test/mocks.ts";

const JdTemplate = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  findByIdAndDelete: vi.fn(),
}));

vi.mock("./jdTemplate.model.ts", () => ({ default: JdTemplate }));

describe("templates.controller — CRUD", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();
  const user = { id: "u1" };

  it("create / list / get / delete", async () => {
    JdTemplate.create.mockResolvedValue({ _id: "t1", name: "SE" });
    JdTemplate.find.mockReturnValue(mockQuery([{ _id: "t1" }]));
    JdTemplate.findById.mockResolvedValue({ _id: "t1", name: "SE" });
    JdTemplate.findByIdAndDelete.mockResolvedValue({});
    const ctrl = await import("./templates.controller.ts");
    const res = mockRes();

    await ctrl.createTemplate(
      {
        user,
        body: {
          name: "SE",
          title: "Software Engineer",
          description: "Build scalable systems",
        },
      } as never,
      res as never,
      next as never,
    );
    expect(res.statusCode).toBe(201);

    await ctrl.listTemplates({} as never, res as never, next as never);
    await ctrl.getTemplate({ params: { id: "t1" } } as never, res as never, next as never);
    expect(res.body).toMatchObject({ name: "SE" });

    await ctrl.deleteTemplate({ params: { id: "t1" } } as never, res as never, next as never);
    expect(res.statusCode).toBe(204);
  });

  it("getTemplate 404", async () => {
    JdTemplate.findById.mockResolvedValue(null);
    const { getTemplate } = await import("./templates.controller.ts");
    const nextFn = vi.fn();
    await getTemplate({ params: { id: "x" } } as never, mockRes() as never, nextFn as never);
    expect(nextFn.mock.calls[0][0]).toMatchObject({ code: "NOT_FOUND" });
  });
});
