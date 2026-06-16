import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenLine, ChevronDown, ChevronUp } from "lucide-react";

interface ShowYourWorkProps {
  /** Unique key for this question (used for state management by parent) */
  questionId: string;
  /** Current scratchpad value */
  value: string;
  /** Called when scratchpad content changes */
  onChange: (value: string) => void;
  /** Optional: whether the scratchpad starts expanded */
  defaultExpanded?: boolean;
  /** Optional: custom placeholder text */
  placeholder?: string;
  /** Optional: additional class names */
  className?: string;
}

export function ShowYourWork({
  questionId,
  value,
  onChange,
  defaultExpanded = false,
  placeholder = "Show your work here... Write out your steps, calculations, or reasoning.",
  className = "",
}: ShowYourWorkProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || value.length > 0);

  return (
    <div className={`${className}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="gap-1.5 text-xs h-7 px-2 text-muted-foreground hover:text-foreground w-full justify-start"
        aria-expanded={expanded}
        aria-controls={`scratchpad-${questionId}`}
      >
        <PenLine className="h-3.5 w-3.5" />
        <span>Show Your Work</span>
        {value.length > 0 && (
          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-primary/10 text-primary">
            has notes
          </span>
        )}
        <span className="ml-auto">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </Button>

      {expanded && (
        <div
          id={`scratchpad-${questionId}`}
          className="mt-1.5 animate-in fade-in-0 slide-in-from-top-1"
          style={{ animationDuration: "150ms" }}
        >
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px] max-h-[200px] text-sm font-mono resize-y bg-muted/30 border-dashed"
            aria-label="Scratchpad for showing your work"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Use this space to write out your steps. Your work is saved automatically.
          </p>
        </div>
      )}
    </div>
  );
}
