import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery, mockRes } from "../../test/mocks.ts";

const Department = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
}));

vi.mock("./department.model.ts", () => ({ default: Department }));

describe("departments.controller — CRUD", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();

  it("create / list / update / delete", async () => {
    Department.create.mockResolvedValue({ _id: "d1", name: "Eng", code: "ENG" });
    Department.find.mockReturnValue(mockQuery([{ _id: "d1" }]));
    Department.findByIdAndUpdate.mockResolvedValue({ _id: "d1", name: "Engineering" });
    Department.findByIdAndDelete.mockResolvedValue({});
    const ctrl = await import("./departments.controller.ts");
    const res = mockRes();

    await ctrl.createDepartment(
      { body: { name: "Eng", code: "ENG" } } as never,
      res as never,
      next as never,
    );
    expect(res.statusCode).toBe(201);

    await ctrl.listDepartments({} as never, res as never, next as never);
    expect(res.body).toHaveLength(1);

    await ctrl.updateDepartment(
      { params: { id: "d1" }, body: { name: "Engineering" } } as never,
      res as never,
      next as never,
    );
    expect(res.body).toMatchObject({ name: "Engineering" });

    await ctrl.deleteDepartment({ params: { id: "d1" } } as never, res as never, next as never);
    expect(res.statusCode).toBe(204);
  });

  it("update 404 when missing", async () => {
    Department.findByIdAndUpdate.mockResolvedValue(null);
    const { updateDepartment } = await import("./departments.controller.ts");
    const nextFn = vi.fn();
    await updateDepartment(
      { params: { id: "missing" }, body: { name: "X" } } as never,
      mockRes() as never,
      nextFn as never,
    );
    expect(nextFn.mock.calls[0][0]).toMatchObject({ code: "NOT_FOUND" });
  });
});
