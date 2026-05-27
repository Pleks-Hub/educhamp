/**
 * EduChamp — Demo Request Tests
 *
 * Tests cover:
 *  1. submitDemoRequest input schema validation
 *  2. interestType enum validation
 *  3. listDemoRequests input schema defaults and constraints
 *  4. Interest label mapping logic
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

// ─── Shared schemas (mirrors routers/landing.ts and routers/admin.ts) ─────────

const submitDemoRequestSchema = z.object({
  fullName: z.string().min(2).max(256),
  schoolName: z.string().min(2).max(256),
  roleTitle: z.string().min(2).max(128),
  email: z.string().email().max(320),
  phone: z.string().max(32).optional(),
  numStudents: z.string().max(64).optional(),
  gradeLevels: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  challenges: z.string().max(2000).optional(),
  interestType: z
    .enum(["demo", "pilot", "district_license", "campus_license", "partnership", "curriculum_licensing", "other"])
    .default("demo"),
  preferredTime: z.string().max(128).optional(),
  notes: z.string().max(2000).optional(),
});

const listDemoRequestsSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(["all", "new", "contacted", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost", "on_hold"])
    .default("all"),
  interestType: z
    .enum(["all", "demo", "pilot", "district_license", "campus_license", "partnership", "curriculum_licensing", "other"])
    .default("all"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

// ─── Interest label helper (mirrors routers/landing.ts) ───────────────────────

function getInterestLabel(interestType: string): string {
  const labels: Record<string, string> = {
    demo: "Product Demo",
    pilot: "Pilot Program",
    district_license: "District License",
    campus_license: "Campus License",
    partnership: "Partnership",
    curriculum_licensing: "Curriculum Licensing",
    other: "General Inquiry",
  };
  return labels[interestType] ?? interestType;
}

// ─── 1. submitDemoRequest — required field validation ─────────────────────────

describe("submitDemoRequest schema — required fields", () => {
  const validBase = {
    fullName: "Jane Smith",
    schoolName: "Katy ISD",
    roleTitle: "Curriculum Director",
    email: "jane.smith@katyisd.org",
  };

  it("accepts a minimal valid payload", () => {
    const result = submitDemoRequestSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated payload", () => {
    const result = submitDemoRequestSchema.safeParse({
      ...validBase,
      phone: "281-555-0100",
      numStudents: "1200",
      gradeLevels: ["9", "10", "11"],
      subjects: ["Algebra I", "Biology"],
      challenges: "Students struggle with algebra foundations.",
      interestType: "district_license",
      preferredTime: "Tuesday 2–4 PM CST",
      notes: "We have a board meeting in June.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fullName", () => {
    const { fullName: _omit, ...rest } = validBase;
    const result = submitDemoRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing schoolName", () => {
    const { schoolName: _omit, ...rest } = validBase;
    const result = submitDemoRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing roleTitle", () => {
    const { roleTitle: _omit, ...rest } = validBase;
    const result = submitDemoRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const { email: _omit, ...rest } = validBase;
    const result = submitDemoRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = submitDemoRequestSchema.safeParse({ ...validBase, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects fullName shorter than 2 characters", () => {
    const result = submitDemoRequestSchema.safeParse({ ...validBase, fullName: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects schoolName shorter than 2 characters", () => {
    const result = submitDemoRequestSchema.safeParse({ ...validBase, schoolName: "K" });
    expect(result.success).toBe(false);
  });

  it("rejects roleTitle shorter than 2 characters", () => {
    const result = submitDemoRequestSchema.safeParse({ ...validBase, roleTitle: "X" });
    expect(result.success).toBe(false);
  });
});

// ─── 2. submitDemoRequest — interestType enum ─────────────────────────────────

describe("submitDemoRequest schema — interestType enum", () => {
  const validBase = {
    fullName: "Jane Smith",
    schoolName: "Katy ISD",
    roleTitle: "Curriculum Director",
    email: "jane@katyisd.org",
  };

  it("defaults interestType to 'demo' when omitted", () => {
    const result = submitDemoRequestSchema.parse(validBase);
    expect(result.interestType).toBe("demo");
  });

  it.each(["demo", "pilot", "district_license", "campus_license", "partnership", "curriculum_licensing", "other"])(
    "accepts interestType '%s'",
    (type) => {
      const result = submitDemoRequestSchema.safeParse({ ...validBase, interestType: type });
      expect(result.success).toBe(true);
    }
  );

  it("rejects an unknown interestType value", () => {
    const result = submitDemoRequestSchema.safeParse({ ...validBase, interestType: "free_trial" });
    expect(result.success).toBe(false);
  });
});

// ─── 3. listDemoRequests — input schema ───────────────────────────────────────

describe("listDemoRequests schema", () => {
  it("parses with all defaults when called with empty object", () => {
    const result = listDemoRequestsSchema.parse({});
    expect(result.status).toBe("all");
    expect(result.interestType).toBe("all");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it("accepts valid status filter values", () => {
    const statuses = ["all", "new", "contacted", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost", "on_hold"];
    for (const status of statuses) {
      const result = listDemoRequestsSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown status filter", () => {
    const result = listDemoRequestsSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(false);
  });

  it("rejects pageSize above 100", () => {
    const result = listDemoRequestsSchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects page below 1", () => {
    const result = listDemoRequestsSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts a search string", () => {
    const result = listDemoRequestsSchema.safeParse({ search: "Katy ISD" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBe("Katy ISD");
  });
});

// ─── 4. Interest label mapping ────────────────────────────────────────────────

describe("getInterestLabel", () => {
  it("maps 'demo' to 'Product Demo'", () => {
    expect(getInterestLabel("demo")).toBe("Product Demo");
  });

  it("maps 'pilot' to 'Pilot Program'", () => {
    expect(getInterestLabel("pilot")).toBe("Pilot Program");
  });

  it("maps 'district_license' to 'District License'", () => {
    expect(getInterestLabel("district_license")).toBe("District License");
  });

  it("maps 'campus_license' to 'Campus License'", () => {
    expect(getInterestLabel("campus_license")).toBe("Campus License");
  });

  it("maps 'partnership' to 'Partnership'", () => {
    expect(getInterestLabel("partnership")).toBe("Partnership");
  });

  it("maps 'curriculum_licensing' to 'Curriculum Licensing'", () => {
    expect(getInterestLabel("curriculum_licensing")).toBe("Curriculum Licensing");
  });

  it("maps 'other' to 'General Inquiry'", () => {
    expect(getInterestLabel("other")).toBe("General Inquiry");
  });

  it("returns the raw value for unknown types", () => {
    expect(getInterestLabel("unknown_type")).toBe("unknown_type");
  });
});
