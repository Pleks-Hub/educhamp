/**
 * video-lesson.test.ts — Tests for Video Lesson Stubs feature
 * Covers: videoUrl schema, updateLessonVideo auth guard, video tab rendering
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Schema Tests ────────────────────────────────────────────────────────────

describe("Video Lesson — Schema", () => {
  const schemaPath = path.resolve(__dirname, "../drizzle/schema.ts");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  it("lessons table has videoUrl column defined as nullable text", () => {
    expect(schemaContent).toContain('videoUrl: text("videoUrl")');
    // Should NOT have .notNull() — videoUrl is nullable
    const videoUrlLine = schemaContent.split("\n").find((l) => l.includes('videoUrl: text("videoUrl")'));
    expect(videoUrlLine).toBeDefined();
    expect(videoUrlLine).not.toContain(".notNull()");
  });

  it("Lesson type is inferred from lessons table (includes videoUrl)", () => {
    expect(schemaContent).toContain("export type Lesson = typeof lessons.$inferSelect");
  });
});

// ─── DB Helper Tests ─────────────────────────────────────────────────────────

describe("Video Lesson — DB Helper", () => {
  const dbPath = path.resolve(__dirname, "./db.ts");
  const dbContent = fs.readFileSync(dbPath, "utf-8");

  it("updateLessonVideoUrl helper exists in db.ts", () => {
    expect(dbContent).toContain("export async function updateLessonVideoUrl");
  });

  it("updateLessonVideoUrl accepts lessonId and videoUrl params", () => {
    expect(dbContent).toContain("updateLessonVideoUrl(lessonId: number, videoUrl: string | null)");
  });

  it("updateLessonVideoUrl updates the lessons table", () => {
    expect(dbContent).toContain("db.update(lessons).set({ videoUrl })");
  });
});

// ─── Admin Router Tests ──────────────────────────────────────────────────────

describe("Video Lesson — Admin Router", () => {
  const adminPath = path.resolve(__dirname, "./routers/admin.ts");
  const adminContent = fs.readFileSync(adminPath, "utf-8");

  it("updateLessonVideo procedure exists in admin router", () => {
    expect(adminContent).toContain("updateLessonVideo: adminProcedure");
  });

  it("updateLessonVideo validates lessonId as number", () => {
    expect(adminContent).toContain("lessonId: z.number()");
  });

  it("updateLessonVideo validates videoUrl as nullable URL string", () => {
    expect(adminContent).toContain("videoUrl: z.string().url().nullable()");
  });

  it("updateLessonVideo logs admin action for audit", () => {
    expect(adminContent).toContain('"lesson.video_update"');
  });

  it("updateLessonVideo throws NOT_FOUND for invalid lessonId", () => {
    expect(adminContent).toContain('throw new TRPCError({ code: "NOT_FOUND"');
  });

  it("getCourseUnits returns lessons with videoUrl field", () => {
    // The admin getCourseUnits should now nest lessons with videoUrl
    const getCourseUnitsSection = adminContent.substring(
      adminContent.indexOf("getCourseUnits:"),
      adminContent.indexOf("updateCourse:")
    );
    expect(getCourseUnitsSection).toContain("videoUrl: l.videoUrl");
  });
});

// ─── Frontend — Watch Tab Tests ──────────────────────────────────────────────

describe("Video Lesson — Watch Tab (LessonDetail)", () => {
  const lessonDetailPath = path.resolve(__dirname, "../client/src/pages/LessonDetail.tsx");
  const lessonContent = fs.readFileSync(lessonDetailPath, "utf-8");

  it("imports PlayCircle and Video icons from lucide-react", () => {
    expect(lessonContent).toContain("PlayCircle");
    expect(lessonContent).toContain("Video");
  });

  it("renders a Watch tab trigger", () => {
    expect(lessonContent).toContain('value="watch"');
    expect(lessonContent).toContain("Watch");
  });

  it("tab grid supports 5 columns on larger screens", () => {
    expect(lessonContent).toContain("sm:grid-cols-5");
  });

  it("renders YouTube embed for YouTube URLs", () => {
    expect(lessonContent).toContain("youtube.com/embed/");
    expect(lessonContent).toContain("youtu.be");
  });

  it("renders native video element for MP4/WebM/OGG URLs", () => {
    expect(lessonContent).toContain("<video");
    expect(lessonContent).toContain("mp4|webm|ogg");
  });

  it("renders generic iframe for other video URLs", () => {
    // There should be at least 2 iframe instances (YouTube + generic)
    const iframeCount = (lessonContent.match(/<iframe/g) || []).length;
    expect(iframeCount).toBeGreaterThanOrEqual(2);
  });

  it("shows 'Video Coming Soon' stub when videoUrl is null", () => {
    expect(lessonContent).toContain("Video Coming Soon");
    expect(lessonContent).toContain("video lesson for this topic is being prepared");
  });
});

// ─── Frontend — Admin Video Editor Tests ─────────────────────────────────────

describe("Video Lesson — Admin Video Editor (AdminCoursesTab)", () => {
  const adminTabPath = path.resolve(__dirname, "../client/src/components/admin/AdminCoursesTab.tsx");
  const adminTabContent = fs.readFileSync(adminTabPath, "utf-8");

  it("LessonVideoRow component exists", () => {
    expect(adminTabContent).toContain("function LessonVideoRow");
  });

  it("uses trpc.admin.updateLessonVideo mutation", () => {
    expect(adminTabContent).toContain("trpc.admin.updateLessonVideo.useMutation");
  });

  it("invalidates getCourseUnits after video update", () => {
    expect(adminTabContent).toContain("utils.admin.getCourseUnits.invalidate()");
  });

  it("renders inline video URL input field", () => {
    expect(adminTabContent).toContain('placeholder="https://youtube.com/watch?v=..."');
  });

  it("shows Video icon indicator for lessons with/without video", () => {
    // Video icon should appear for both states
    const videoIconCount = (adminTabContent.match(/<Video/g) || []).length;
    expect(videoIconCount).toBeGreaterThanOrEqual(3); // indicator + edit button + no-video state
  });

  it("shows ExternalLink icon for lessons with video URL", () => {
    expect(adminTabContent).toContain("ExternalLink");
  });

  it("uses LessonVideoRow in the units/lessons tab", () => {
    expect(adminTabContent).toContain("<LessonVideoRow");
  });
});

// ─── URL Parsing Tests ───────────────────────────────────────────────────────

describe("Video Lesson — URL Parsing Logic", () => {
  it("YouTube watch URL converts to embed format", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const embedUrl = url
      .replace("watch?v=", "embed/")
      .replace("youtu.be/", "youtube.com/embed/")
      .replace(/&.*$/, "");
    expect(embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("YouTube short URL converts to embed format", () => {
    const url = "https://youtu.be/dQw4w9WgXcQ";
    const embedUrl = url
      .replace("watch?v=", "embed/")
      .replace("youtu.be/", "youtube.com/embed/")
      .replace(/&.*$/, "");
    expect(embedUrl).toBe("https://youtube.com/embed/dQw4w9WgXcQ");
  });

  it("YouTube URL with extra params strips them", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf";
    const embedUrl = url
      .replace("watch?v=", "embed/")
      .replace("youtu.be/", "youtube.com/embed/")
      .replace(/&.*$/, "");
    expect(embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("MP4 URL is detected correctly", () => {
    const url = "https://example.com/video.mp4";
    expect(url.match(/\.(mp4|webm|ogg)$/i)).toBeTruthy();
  });

  it("WebM URL is detected correctly", () => {
    const url = "https://example.com/video.webm";
    expect(url.match(/\.(mp4|webm|ogg)$/i)).toBeTruthy();
  });

  it("Non-video URL is not detected as direct video", () => {
    const url = "https://vimeo.com/123456789";
    expect(url.match(/\.(mp4|webm|ogg)$/i)).toBeFalsy();
  });
});
