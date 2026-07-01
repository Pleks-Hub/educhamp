import { useMemo } from "react";
import { Mic } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface VoicePickerProps {
  voices: SpeechSynthesisVoice[];
  selectedVoiceUri: string | null;
  onVoiceChange: (voiceUri: string | null) => void;
  language?: string;
  className?: string;
}

export function VoicePicker({
  voices,
  selectedVoiceUri,
  onVoiceChange,
  language = "en",
  className,
}: VoicePickerProps) {
  // Filter voices by language and sort by name
  const filteredVoices = useMemo(() => {
    const langPrefix = language.split("-")[0].toLowerCase();
    return voices
      .filter(v => v.lang.toLowerCase().startsWith(langPrefix))
      .sort((a, b) => {
        // Prefer local voices over remote
        if (a.localService && !b.localService) return -1;
        if (!a.localService && b.localService) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [voices, language]);

  if (filteredVoices.length === 0) return null;

  const getVoiceLabel = (voice: SpeechSynthesisVoice) => {
    // Extract a friendly name (remove "Microsoft", "Google", etc. prefixes for brevity)
    let name = voice.name;
    name = name.replace(/^(Microsoft|Google|Apple)\s+/i, "");
    // Add gender hint if detectable from name
    return name;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Mic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Select
        value={selectedVoiceUri || "__default__"}
        onValueChange={(val) => onVoiceChange(val === "__default__" ? null : val)}
      >
        <SelectTrigger className="h-7 text-xs w-[140px] border-muted">
          <SelectValue placeholder="Default voice" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          <SelectItem value="__default__">Default voice</SelectItem>
          {filteredVoices.map((voice) => (
            <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
              {getVoiceLabel(voice)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
