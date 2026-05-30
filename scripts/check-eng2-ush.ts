import { db } from "../server/db";
import { courses, units, quizQuestions } from "../drizzle/schema";
import { eq, inArray, count } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      id: courses.id,
      code: courses.courseCode,
      title: courses.title,
      isActive: courses.isActive,
      isDefault: courses.isDefault,
    })
    .from(courses)
    .where(inArray(courses.courseCode, ["ENG2", "USH"]));

  for (const c of rows) {
    const [uCount] = await db
      .select({ n: count() })
      .from(units)
      .where(eq(units.courseId, c.id));
    const [qCount] = await db
      .select({ n: count() })
      .from(quizQuestions)
      .where(eq(quizQuestions.courseId, c.id));
    console.log(
      JSON.stringify({
        ...c,
        units: Number(uCount.n),
        questions: Number(qCount.n),
      })
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
