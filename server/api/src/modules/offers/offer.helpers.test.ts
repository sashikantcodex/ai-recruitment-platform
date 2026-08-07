import { describe, expect, it } from "vitest";
import {
  clampOfferToBand,
  offerDecisionStage,
  recommendSalary,
} from "./offer.helpers.ts";

describe("offer.helpers", () => {
  const band = { min: 100000, mid: 120000, max: 140000 };

  it("clamps salary into band", () => {
    expect(clampOfferToBand(90000, band)).toBe(100000);
    expect(clampOfferToBand(150000, band)).toBe(140000);
    expect(clampOfferToBand(125000, band)).toBe(125000);
  });

  it("recommends mid unless override provided", () => {
    expect(recommendSalary(120000)).toBe(120000);
    expect(recommendSalary(120000, 130000)).toBe(130000);
  });

  it("maps decision to application stage", () => {
    expect(offerDecisionStage("accepted")).toBe("hired");
    expect(offerDecisionStage("declined")).toBe("rejected");
  });
});
