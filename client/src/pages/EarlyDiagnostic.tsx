/**
 * EarlyDiagnostic.tsx
 * Visual/audio placement diagnostic for Pre-K through Grade 2.
 * Uses large touch-friendly buttons, emoji-based questions, and Web Speech API narration.
 * Automatically routed from /diagnostic when the student's grade is Pre-K, K, 1, or 2.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ─── Question bank ────────────────────────────────────────────────────────────

type VisualQuestion = {
  id: string;
  subject: "math" | "ela" | "science" | "social_studies";
  grade: "Pre-K" | "Kindergarten" | "Grade 1" | "Grade 2";
  questionText: string;
  narration: string; // what the TTS reads aloud
  choices: { emoji: string; label: string; value: string }[];
  correctValue: string;
  mapsToUnit: string;
};

const VISUAL_QUESTIONS: VisualQuestion[] = [
  // ── Pre-K Math ──────────────────────────────────────────────────────────────
  {
    id: "prek-math-1",
    subject: "math",
    grade: "Pre-K",
    questionText: "How many apples do you see? 🍎🍎🍎",
    narration: "How many apples do you see? Count the apples!",
    choices: [
      { emoji: "1️⃣", label: "1", value: "1" },
      { emoji: "2️⃣", label: "2", value: "2" },
      { emoji: "3️⃣", label: "3", value: "3" },
      { emoji: "4️⃣", label: "4", value: "4" },
    ],
    correctValue: "3",
    mapsToUnit: "Unit 1",
  },
  {
    id: "prek-math-2",
    subject: "math",
    grade: "Pre-K",
    questionText: "Which shape is a circle? 🔴 🟦 🔺 🟩",
    narration: "Which one is a circle? Tap the circle!",
    choices: [
      { emoji: "🔴", label: "Circle", value: "circle" },
      { emoji: "🟦", label: "Square", value: "square" },
      { emoji: "🔺", label: "Triangle", value: "triangle" },
      { emoji: "🟩", label: "Rectangle", value: "rectangle" },
    ],
    correctValue: "circle",
    mapsToUnit: "Unit 2",
  },
  // ── Pre-K ELA ───────────────────────────────────────────────────────────────
  {
    id: "prek-ela-1",
    subject: "ela",
    grade: "Pre-K",
    questionText: "Which picture starts with the letter A? 🍎 🐶 🌙 🚗",
    narration: "Which picture starts with the letter A? Tap the right one!",
    choices: [
      { emoji: "🍎", label: "Apple", value: "apple" },
      { emoji: "🐶", label: "Dog", value: "dog" },
      { emoji: "🌙", label: "Moon", value: "moon" },
      { emoji: "🚗", label: "Car", value: "car" },
    ],
    correctValue: "apple",
    mapsToUnit: "Unit 1",
  },
  // ── Kindergarten Math ───────────────────────────────────────────────────────
  {
    id: "k-math-1",
    subject: "math",
    grade: "Kindergarten",
    questionText: "Count the stars: ⭐⭐⭐⭐⭐",
    narration: "Count all the stars! How many are there?",
    choices: [
      { emoji: "3️⃣", label: "3", value: "3" },
      { emoji: "4️⃣", label: "4", value: "4" },
      { emoji: "5️⃣", label: "5", value: "5" },
      { emoji: "6️⃣", label: "6", value: "6" },
    ],
    correctValue: "5",
    mapsToUnit: "Unit 1",
  },
  {
    id: "k-math-2",
    subject: "math",
    grade: "Kindergarten",
    questionText: "Which group has MORE? 🐱🐱🐱 or 🐶🐶🐶🐶🐶",
    narration: "Which group has more animals? Tap the bigger group!",
    choices: [
      { emoji: "🐱🐱🐱", label: "3 cats", value: "cats" },
      { emoji: "🐶🐶🐶🐶🐶", label: "5 dogs", value: "dogs" },
    ],
    correctValue: "dogs",
    mapsToUnit: "Unit 2",
  },
  {
    id: "k-ela-1",
    subject: "ela",
    grade: "Kindergarten",
    questionText: "Which word rhymes with CAT? 🐱",
    narration: "Which word rhymes with CAT? Listen carefully!",
    choices: [
      { emoji: "🎩", label: "HAT", value: "hat" },
      { emoji: "🐕", label: "DOG", value: "dog" },
      { emoji: "🌳", label: "TREE", value: "tree" },
      { emoji: "🚂", label: "TRAIN", value: "train" },
    ],
    correctValue: "hat",
    mapsToUnit: "Unit 3",
  },
  // ── Grade 1 Math ────────────────────────────────────────────────────────────
  {
    id: "g1-math-1",
    subject: "math",
    grade: "Grade 1",
    questionText: "What is 4 + 3 = ?",
    narration: "What is 4 plus 3? Tap the right answer!",
    choices: [
      { emoji: "6️⃣", label: "6", value: "6" },
      { emoji: "7️⃣", label: "7", value: "7" },
      { emoji: "8️⃣", label: "8", value: "8" },
      { emoji: "5️⃣", label: "5", value: "5" },
    ],
    correctValue: "7",
    mapsToUnit: "Unit 1",
  },
  {
    id: "g1-math-2",
    subject: "math",
    grade: "Grade 1",
    questionText: "Which number is BIGGER? 15 or 9?",
    narration: "Which number is bigger? 15 or 9? Tap the bigger number!",
    choices: [
      { emoji: "🔢", label: "15", value: "15" },
      { emoji: "🔢", label: "9", value: "9" },
    ],
    correctValue: "15",
    mapsToUnit: "Unit 2",
  },
  {
    id: "g1-ela-1",
    subject: "ela",
    grade: "Grade 1",
    questionText: "Which word is spelled correctly?",
    narration: "Which word is spelled correctly? Tap the right one!",
    choices: [
      { emoji: "🐱", label: "CAT", value: "cat" },
      { emoji: "🐱", label: "KAT", value: "kat" },
      { emoji: "🐱", label: "CAT", value: "cat2" },
      { emoji: "🐱", label: "KET", value: "ket" },
    ],
    correctValue: "cat",
    mapsToUnit: "Unit 1",
  },
  // ── Grade 2 Math ────────────────────────────────────────────────────────────
  {
    id: "g2-math-1",
    subject: "math",
    grade: "Grade 2",
    questionText: "What is 25 + 13 = ?",
    narration: "What is 25 plus 13? Tap the right answer!",
    choices: [
      { emoji: "🔢", label: "38", value: "38" },
      { emoji: "🔢", label: "37", value: "37" },
      { emoji: "🔢", label: "39", value: "39" },
      { emoji: "🔢", label: "36", value: "36" },
    ],
    correctValue: "38",
    mapsToUnit: "Unit 1",
  },
  {
    id: "g2-math-2",
    subject: "math",
    grade: "Grade 2",
    questionText: "How many tens are in 40?",
    narration: "How many tens are in 40? Tap the right answer!",
    choices: [
      { emoji: "2️⃣", label: "2", value: "2" },
      { emoji: "4️⃣", label: "4", value: "4" },
      { emoji: "5️⃣", label: "5", value: "5" },
      { emoji: "3️⃣", label: "3", value: "3" },
    ],
    correctValue: "4",
    mapsToUnit: "Unit 2",
  },
  {
    id: "g2-ela-1",
    subject: "ela",
    grade: "Grade 2",
    questionText: "Which sentence uses a CAPITAL letter correctly?",
    narration: "Which sentence uses a capital letter correctly? Tap the right one!",
    choices: [
      { emoji: "📝", label: "my dog is big.", value: "wrong1" },
      { emoji: "📝", label: "My dog is big.", value: "correct" },
      { emoji: "📝", label: "my Dog is big.", value: "wrong2" },
      { emoji: "📝", label: "my dog Is big.", value: "wrong3" },
    ],
    correctValue: "correct",
    mapsToUnit: "Unit 2",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGradeQuestions(grade: string): VisualQuestion[] {
  const gradeMap: Record<string, VisualQuestion["grade"]> = {
    "pre-k": "Pre-K",
    "prek": "Pre-K",
    "pre_k": "Pre-K",
    "kindergarten": "Kindergarten",
    "k": "Kindergarten",
    "1": "Grade 1",
    "grade 1": "Grade 1",
    "2": "Grade 2",
    "grade 2": "Grade 2",
  };
  const mapped = gradeMap[grade.toLowerCase()] ?? "Kindergarten";
  const gradeQs = VISUAL_QUESTIONS.filter((q) => q.grade === mapped);
  // Always include at least 3 questions; pad with Pre-K if needed
  if (gradeQs.length < 3) {
    return VISUAL_QUESTIONS.filter((q) => q.grade === "Pre-K").slice(0, 3);
  }
  return gradeQs;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1.1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

// ─── Component ────────────────────────────────────────────────────────────────

type AnswerRecord = {
  questionId: string;
  answer: string;
  correct: boolean;
  mapsToUnit: string;
};

export default function EarlyDiagnostic() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const grade = user?.grade ?? "Kindergarten";
  const questions = getGradeQuestions(grade);

  const [step, setStep] = useState<"intro" | "question" | "feedback" | "complete">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDiagnostic = trpc.diagnostic.saveDiagnosticResults.useMutation({
    onSuccess: () => {
      navigate("/");
    },
    onError: () => {
      toast.error("Could not save results. Please try again.");
    },
  });

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const progress = ((currentIdx) / totalQuestions) * 100;

  // Auto-narrate question when it appears
  useEffect(() => {
    if (step === "question" && currentQuestion) {
      const timer = setTimeout(() => speak(currentQuestion.narration), 400);
      return () => clearTimeout(timer);
    }
  }, [step, currentIdx, currentQuestion]);

  // Narrate intro
  useEffect(() => {
    if (step === "intro") {
      const timer = setTimeout(
        () => speak("Hi! Let's do a quick learning check. Tap the right answer!"),
        600
      );
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleAnswer = useCallback(
    (value: string) => {
      if (selected !== null) return; // prevent double-tap
      const correct = value === currentQuestion.correctValue;
      setSelected(value);
      setIsCorrect(correct);

      const record: AnswerRecord = {
        questionId: currentQuestion.id,
        answer: value,
        correct,
        mapsToUnit: currentQuestion.mapsToUnit,
      };
      const newAnswers = [...answers, record];
      setAnswers(newAnswers);

      speak(correct ? "Great job! That's right! 🌟" : "Good try! Let's keep going!");

      setStep("feedback");
      feedbackTimer.current = setTimeout(() => {
        if (currentIdx + 1 >= totalQuestions) {
          setStep("complete");
          // Submit results
          const score = Math.round(
            (newAnswers.filter((a) => a.correct).length / newAnswers.length) * 100
          );
          const unitResults = questions.map((q) => {
            const ans = newAnswers.find((a) => a.questionId === q.id);
            return {
              unit: q.mapsToUnit,
              score: ans?.correct ? 100 : 0,
              ready: ans?.correct ?? false,
            };
          });
          saveDiagnostic.mutate({
            score,
            recommendation: score >= 70 ? "Ready for grade-level work" : "Start from the beginning",
            unitResults,
          });
        } else {
          setCurrentIdx((i) => i + 1);
          setSelected(null);
          setIsCorrect(null);
          setStep("question");
        }
      }, 1800);
    },
    [selected, currentQuestion, answers, currentIdx, totalQuestions, questions, saveDiagnostic]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Intro screen ─────────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-yellow-50 to-orange-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-8xl mb-6 animate-bounce">🌟</div>
        <h1 className="text-4xl font-bold text-orange-600 mb-4">
          Learning Check!
        </h1>
        <p className="text-2xl text-gray-700 mb-2 max-w-md">
          Let's see what you know! 🎉
        </p>
        <p className="text-lg text-gray-500 mb-8 max-w-sm">
          Tap the right answer for each question.
        </p>
        <div className="flex gap-3 mb-8">
          {questions.map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full bg-orange-200"
            />
          ))}
        </div>
        <Button
          onClick={() => setStep("question")}
          className="text-2xl px-10 py-6 rounded-3xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg transform hover:scale-105 transition-all"
        >
          Let's Go! 🚀
        </Button>
        <button
          onClick={() => speak("Hi! Let's do a quick learning check. Tap the right answer!")}
          className="mt-4 text-sm text-gray-400 underline"
        >
          🔊 Read aloud again
        </button>
      </div>
    );
  }

  // ── Complete screen ───────────────────────────────────────────────────────────
  if (step === "complete") {
    const correctCount = answers.filter((a) => a.correct).length;
    const score = Math.round((correctCount / answers.length) * 100);
    return (
      <div className="min-h-dvh bg-gradient-to-b from-green-50 to-teal-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-4xl font-bold text-green-600 mb-4">
          Amazing job! 🎉
        </h1>
        <p className="text-2xl text-gray-700 mb-6">
          You got {correctCount} out of {answers.length} right!
        </p>
        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          {answers.map((a, i) => (
            <span key={i} className="text-3xl">
              {a.correct ? "⭐" : "💙"}
            </span>
          ))}
        </div>
        <p className="text-lg text-gray-500 mb-8">
          {score >= 70
            ? "You're ready to start learning! 🚀"
            : "Let's start from the beginning and build up! 💪"}
        </p>
        {saveDiagnostic.isPending ? (
          <p className="text-gray-400 animate-pulse">Saving your results... ✨</p>
        ) : (
          <Button
            onClick={() => navigate("/")}
            className="text-xl px-8 py-5 rounded-3xl bg-green-500 hover:bg-green-600 text-white shadow-lg"
          >
            Go to My Dashboard! 🏠
          </Button>
        )}
      </div>
    );
  }

  // ── Question screen ───────────────────────────────────────────────────────────
  const choiceCount = currentQuestion.choices.length;
  const gridCols = choiceCount === 2 ? "grid-cols-2" : "grid-cols-2";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blue-50 to-indigo-50 flex flex-col p-4">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 font-medium">
            Question {currentIdx + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
            {answers.filter((a) => a.correct).length} ⭐
          </span>
        </div>
        <Progress value={progress} className="h-3 rounded-full" />
      </div>

      {/* Question card */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl p-6 w-full mb-6 text-center">
          <div className="text-5xl mb-4">
            {currentQuestion.subject === "math" ? "🔢" :
             currentQuestion.subject === "ela" ? "📚" :
             currentQuestion.subject === "science" ? "🔬" : "🌍"}
          </div>
          <p className="text-2xl font-bold text-gray-800 leading-relaxed">
            {currentQuestion.questionText}
          </p>
          <button
            onClick={() => speak(currentQuestion.narration)}
            className="mt-3 text-sm text-indigo-400 underline flex items-center gap-1 mx-auto"
          >
            🔊 Read to me
          </button>
        </div>

        {/* Answer choices */}
        <div className={`grid ${gridCols} gap-4 w-full`}>
          {currentQuestion.choices.map((choice) => {
            const isSelected = selected === choice.value;
            const isRight = choice.value === currentQuestion.correctValue;
            let btnClass =
              "flex flex-col items-center justify-center gap-2 p-5 rounded-3xl text-center border-4 transition-all duration-200 shadow-md min-h-[100px] cursor-pointer select-none active:scale-95 ";

            if (step === "feedback") {
              if (isSelected && isRight) {
                btnClass += "border-green-400 bg-green-100 scale-105";
              } else if (isSelected && !isRight) {
                btnClass += "border-red-400 bg-red-100";
              } else if (isRight) {
                btnClass += "border-green-300 bg-green-50";
              } else {
                btnClass += "border-gray-200 bg-white opacity-60";
              }
            } else {
              btnClass += "border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:scale-105";
            }

            return (
              <button
                key={choice.value}
                className={btnClass}
                onClick={() => handleAnswer(choice.value)}
                disabled={step === "feedback"}
              >
                <span className="text-4xl">{choice.emoji}</span>
                <span className="text-lg font-bold text-gray-700">{choice.label}</span>
                {step === "feedback" && isSelected && (
                  <span className="text-2xl">{isRight ? "✅" : "❌"}</span>
                )}
                {step === "feedback" && !isSelected && isRight && (
                  <span className="text-2xl">✅</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback message */}
        {step === "feedback" && (
          <div
            className={`mt-6 text-2xl font-bold text-center transition-all duration-300 ${
              isCorrect ? "text-green-600" : "text-orange-500"
            }`}
          >
            {isCorrect ? "⭐ Great job! That's right!" : "💙 Good try! Keep going!"}
          </div>
        )}
      </div>
    </div>
  );
}
