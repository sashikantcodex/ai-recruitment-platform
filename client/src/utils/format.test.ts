import { describe, expect, it } from "vitest";
import { formatScore, isApplicationStage, joinList, selectableStages, stageLabel } from "./format";

describe("formatScore", () => {
  it("formats numeric scores", () => {
    expect(formatScore(88)).toBe("88");
  });

  it("returns em dash for missing scores", () => {
    expect(formatScore(undefined)).toBe("—");
  });
});

describe("joinList", () => {
  it("joins skills", () => {
    expect(joinList(["React", "TypeScript"])).toBe("React, TypeScript");
  });

  it("handles empty lists", () => {
    expect(joinList([])).toBe("—");
    expect(joinList(undefined)).toBe("—");
  });
});

describe("stage helpers", () => {
  it("labels stages", () => {
    expect(stageLabel("pending_approval")).toBe("Pending Approval");
  });

  it("validates application stages", () => {
    expect(isApplicationStage("interview")).toBe(true);
    expect(isApplicationStage("unknown")).toBe(false);
  });

  it("limits selectable stages to valid advances", () => {
    expect(selectableStages("applied")).toEqual(["applied", "screened", "rejected"]);
    expect(selectableStages("screened")).toContain("interview");
    expect(selectableStages("screened")).not.toContain("hired");
  });
});
