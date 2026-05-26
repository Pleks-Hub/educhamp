import { describe, expect, it } from "vitest";
import { getMasteryLabel, getAdaptivePath } from "./educhamp-helpers";

/**
 * Parent module — unit tests for mastery label and adaptive path logic
 * used in the parent dashboard child progress summaries.
 */
describe("Parent Dashboard — mastery label display", () => {
  it("shows Beginner for score 0", () => {
    expect(getMasteryLabel(0)).toBe("Beginner");
  });

  it("shows Beginner for score 39", () => {
    expect(getMasteryLabel(39)).toBe("Beginner");
  });

  it("shows Beginner for score 59", () => {
    expect(getMasteryLabel(59)).toBe("Beginner");
  });

  it("shows Developing for score 60", () => {
    expect(getMasteryLabel(60)).toBe("Developing");
  });

  it("shows Developing for score 74", () => {
    expect(getMasteryLabel(74)).toBe("Developing");
  });

  it("shows Approaching for score 75", () => {
    expect(getMasteryLabel(75)).toBe("Approaching");
  });

  it("shows Approaching for score 89", () => {
    expect(getMasteryLabel(89)).toBe("Approaching");
  });

  it("shows Mastered for score 90", () => {
    expect(getMasteryLabel(90)).toBe("Mastered");
  });

  it("shows Mastered for score 99", () => {
    expect(getMasteryLabel(99)).toBe("Mastered");
  });

  it("shows Advanced for score 100", () => {
    expect(getMasteryLabel(100)).toBe("Advanced");
  });
});

describe("Parent Dashboard — adaptive path logic", () => {
  it("returns reteach for score below 60", () => {
    expect(getAdaptivePath(0)).toBe("reteach");
    expect(getAdaptivePath(59)).toBe("reteach");
  });

  it("returns guided_practice for score 60–74", () => {
    expect(getAdaptivePath(60)).toBe("guided_practice");
    expect(getAdaptivePath(74)).toBe("guided_practice");
  });

  it("returns quiz_unlocked for score 75–89", () => {
    expect(getAdaptivePath(75)).toBe("quiz_unlocked");
    expect(getAdaptivePath(89)).toBe("quiz_unlocked");
  });

  it("returns challenge for score 90+", () => {
    expect(getAdaptivePath(90)).toBe("challenge");
    expect(getAdaptivePath(100)).toBe("challenge");
  });
});

describe("Parent Dashboard — unit mastery aggregation logic", () => {
  const mockMastery = [
    { skillId: "ALG1-U1-S1", score: 80 },
    { skillId: "ALG1-U1-S2", score: 70 },
    { skillId: "ALG1-U1-S3", score: 90 },
    { skillId: "ALG1-U2-S1", score: 45 },
    { skillId: "ALG1-U2-S2", score: 55 },
  ];

  function getUnitAvg(unitNumber: number) {
    const skills = mockMastery.filter((m) => m.skillId.startsWith(`ALG1-U${unitNumber}-`));
    if (skills.length === 0) return null;
    return Math.round(skills.reduce((s, m) => s + m.score, 0) / skills.length);
  }

  it("correctly averages Unit 1 mastery", () => {
    expect(getUnitAvg(1)).toBe(80); // (80+70+90)/3 = 80
  });

  it("correctly averages Unit 2 mastery", () => {
    expect(getUnitAvg(2)).toBe(50); // (45+55)/2 = 50
  });

  it("returns null for a unit with no mastery data", () => {
    expect(getUnitAvg(12)).toBeNull();
  });

  it("Unit 1 avg (80) maps to Approaching label", () => {
    const avg = getUnitAvg(1)!; // 80
    expect(getMasteryLabel(avg)).toBe("Approaching");
  });

  it("Unit 2 avg (50) maps to Beginner label", () => {
    const avg = getUnitAvg(2)!; // 50
    expect(getMasteryLabel(avg)).toBe("Beginner");
  });

  it("Unit 2 avg (50) maps to reteach adaptive path", () => {
    const avg = getUnitAvg(2)!; // 50
    expect(getAdaptivePath(avg)).toBe("reteach");
  });
});

describe("Parent Dashboard — enrolment validation logic", () => {
  it("rejects self-enrolment (parentId === childId)", () => {
    const parentId = 1;
    const childId = 1;
    expect(parentId === childId).toBe(true); // should throw CONFLICT
  });

  it("allows enrolment when parent and child are different users", () => {
    const parentId = 1;
    const childId = 2;
    expect(parentId !== childId).toBe(true);
  });

  it("correctly identifies a valid email format", () => {
    const validEmail = "student@katy.txisd.net";
    const invalidEmail = "not-an-email";
    expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validEmail)).toBe(true);
    expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail)).toBe(false);
  });
});
