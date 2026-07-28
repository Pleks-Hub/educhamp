import { useMemo } from "react";
import { Globe, Mic } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Supported TTS languages for manual override */
const TTS_LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português" },
  { code: "zh-CN", label: "中文" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "ar-SA", label: "العربية" },
  { code: "hi-IN", label: "हिन्दी" },
];

/** Neural voice type from server */
interface NeuralVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  description: string;
}

interface VoicePickerProps {
  voices: NeuralVoice[];
  selectedVoiceUri: string | null;
  onVoiceChange: (voiceId: string | null) => void;
  language?: string;
  /** Current manual language override (null = auto-detect) */
  languageOverride?: string | null;
  /** Callback when user selects a language override */
  onLanguageOverride?: (lang: string | null) => void;
  className?: string;
}

export function VoicePicker({
  voices,
  selectedVoiceUri,
  onVoiceChange,
  language = "en",
  languageOverride,
  onLanguageOverride,
  className,
}: VoicePickerProps) {
  // Filter voices by the active language (override or detected)
  const activeLang = languageOverride || language;
  const filteredVoices = useMemo(() => {
    const langPrefix = activeLang.split("-")[0].toLowerCase();
    return voices.filter(v => v.id.toLowerCase().startsWith(langPrefix));
  }, [voices, activeLang]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Language override dropdown */}
      {onLanguageOverride && (
        <div className="flex items-center gap-1">
          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select
            value={languageOverride || "auto"}
            onValueChange={(val) => onLanguageOverride(val === "auto" ? null : val)}
          >
            <SelectTrigger className="h-7 text-xs w-[100px] border-muted">
              <SelectValue placeholder="Auto" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {TTS_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Voice selection dropdown */}
      {filteredVoices.length > 0 && (
        <div className="flex items-center gap-1">
          <Mic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select
            value={selectedVoiceUri || "__default__"}
            onValueChange={(val) => onVoiceChange(val === "__default__" ? null : val)}
          >
            <SelectTrigger className="h-7 text-xs w-[160px] border-muted">
              <SelectValue placeholder="Default voice" />
            </SelectTrigger>
            <SelectContent className="max-h-[250px]">
              <SelectItem value="__default__">Default voice</SelectItem>
              {filteredVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <span className="flex items-center gap-1.5">
                    <span>{voice.name}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {voice.gender === "Female" ? "♀" : "♂"}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
