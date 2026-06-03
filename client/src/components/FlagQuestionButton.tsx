/**
 * FlagQuestionButton — lets students report a quiz or diagnostic question.
 * Renders as a small "Flag" icon button that opens a dialog with reason + details.
 */

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const REASONS = [
  { value: "incorrect_answer", label: "The answer is incorrect" },
  { value: "unclear_question", label: "The question is unclear or confusing" },
  { value: "no_answer_input", label: "No place to type my answer" },
  { value: "wrong_difficulty", label: "Wrong difficulty level" },
  { value: "out_of_scope", label: "Out of scope for this course" },
  { value: "duplicate", label: "This is a duplicate question" },
  { value: "other", label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

interface FlagQuestionButtonProps {
  questionType: "quiz" | "diagnostic";
  questionId: number;
  /** Optional compact mode — icon only, no label */
  compact?: boolean;
}

export function FlagQuestionButton({
  questionType,
  questionId,
  compact = true,
}: FlagQuestionButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [details, setDetails] = useState("");

  const flagMutation = trpc.questionFlags.flagQuestion.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.updated
          ? "Your flag has been updated. Thank you for the feedback!"
          : "Question flagged. Our team will review it shortly."
      );
      setOpen(false);
      setReason("");
      setDetails("");
    },
    onError: () => {
      toast.error("Failed to submit flag. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Please select a reason before submitting.");
      return;
    }
    flagMutation.mutate({
      questionType,
      questionId,
      reason,
      details: details.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Flag this question"
          aria-label="Flag this question"
        >
          <Flag className="h-3.5 w-3.5" />
          {!compact && <span className="ml-1.5 text-xs">Flag</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            Flag this question
          </DialogTitle>
          <DialogDescription>
            Help us improve EduChamp by reporting issues with this question. Our
            curriculum team reviews every flag.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="flag-reason">Reason *</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as Reason)}
            >
              <SelectTrigger id="flag-reason">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flag-details">
              Additional details{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="flag-details"
              placeholder="Describe the issue in more detail…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {details.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || flagMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {flagMutation.isPending ? "Submitting…" : "Submit Flag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
