import { describe, expect, it } from "vitest";
import {
  CampaignCapacityService,
  MAX_SIMULTANEOUS_RECIPROCAL_APPS,
} from "./capacity.service.js";

describe("CampaignCapacityService reciprocity", () => {
  it.each([
    [0, 3],
    [1, 3],
    [3, 3],
    [4, 6],
    [6, 6],
    [7, 9],
    [9, 9],
    [10, 12],
    [20, 12],
  ])("grants %i completed apps a maximum of %i core testers", (completed, expected) => {
    expect(CampaignCapacityService.calculateDeveloperCapacity(completed).maxCoreTesters).toBe(
      expected,
    );
  });

  it("limits users to three simultaneous reciprocal app tests", () => {
    expect(MAX_SIMULTANEOUS_RECIPROCAL_APPS).toBe(3);
  });
});
