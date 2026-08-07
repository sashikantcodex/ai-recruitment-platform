import { describe, expect, it } from "vitest";
import { APPLICATION_STAGES } from "../applications/application.model.ts";

describe("application stages", () => {
  it("covers full hiring pipeline stages", () => {
    expect(APPLICATION_STAGES).toEqual([
      "applied",
      "screened",
      "assessment",
      "interview",
      "offer",
      "hired",
      "rejected",
    ]);
  });
});
