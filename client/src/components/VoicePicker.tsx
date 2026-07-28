import { useMemo, useState, useCallback, useRef } from "react";
import { Globe, Mic, Play, Square, Loader2, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

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

/** Sample sentences for voice preview by language */
const PREVIEW_SAMPLES: Record<string, string> = {
  en: "Hi there! I'm your learning assistant. Let me help you understand this topic.",
  es: "¡Hola! Soy tu asistente de aprendizaje. Déjame ayudarte a entender este tema.",
  fr: "Bonjour ! Je suis votre assistant d'apprentissage. Laissez-moi vous aider.",
  de: "Hallo! Ich bin dein Lernassistent. Lass mich dir bei diesem Thema helfen.",
  it: "Ciao! Sono il tuo assistente di apprendimento. Lascia che ti aiuti.",
  pt: "Olá! Sou seu assistente de aprendizado. Deixe-me ajudá-lo a entender.",
  zh: "你好！我是你的学习助手。让我帮你理解这个话题。",
  ja: "こんにちは！学習アシスタントです。このトピックの理解を手伝います。",
  ko: "안녕하세요! 학습 도우미입니다. 이 주제를 이해하도록 도와드릴게요.",
  ar: "مرحبا! أنا مساعدك في التعلم. دعني أساعدك في فهم هذا الموضوع.",
  hi: "नमस्ते! मैं आपका शिक्षण सहायक हूँ। इस विषय को समझने में मदद करता हूँ।",
};

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

function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

// ─── Preview Audio Cache ────────────────────────────────────────────────────
// Caches synthesized preview audio blobs by voiceId so repeated previews are instant.
const previewCache = new Map<string, { audioBase64: string; contentType: string }>();

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

  // Preview state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const synthesizeMutation = trpc.tts.synthesize.useMutation();

  // Favorite voice — persisted via TTS preferences
  const { data: ttsPrefs } = trpc.tts.getPreferences.useQuery(undefined, {
    staleTime: 60_000,
  });
  const updatePrefsMutation = trpc.tts.updatePreferences.useMutation();
  const utils = trpc.useUtils();

  const favoriteVoiceId = ttsPrefs?.ttsVoiceUri ?? null;

  /** Toggle favorite star for a voice */
  const toggleFavorite = useCallback((voiceId: string) => {
    const newFavorite = favoriteVoiceId === voiceId ? null : voiceId;
    updatePrefsMutation.mutate(
      { ttsVoiceUri: newFavorite },
      {
        onSuccess: () => {
          utils.tts.getPreferences.invalidate();
        },
      }
    );
    // Also select the voice immediately when favoriting
    if (newFavorite) {
      onVoiceChange(newFavorite);
    }
  }, [favoriteVoiceId, updatePrefsMutation, utils, onVoiceChange]);

  /** Stop any currently playing preview */
  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
      previewAudioRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewingVoice(null);
    setPreviewLoading(null);
  }, []);

  /** Play a preview sample for a voice (with caching) */
  const playPreview = useCallback((voiceId: string) => {
    stopPreview();
    const langPrefix = voiceId.split("-")[0].toLowerCase();
    const sampleText = PREVIEW_SAMPLES[langPrefix] || PREVIEW_SAMPLES.en;

    // Check preview cache first
    const cached = previewCache.get(voiceId);
    if (cached) {
      // Cache hit — play immediately without server request
      setPreviewingVoice(voiceId);
      const blob = base64ToBlob(cached.audioBase64, cached.contentType);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;

      const audio = new Audio(url);
      previewAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        previewUrlRef.current = null;
        previewAudioRef.current = null;
        setPreviewingVoice(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        previewUrlRef.current = null;
        previewAudioRef.current = null;
        setPreviewingVoice(null);
      };

      audio.play().catch(() => {
        setPreviewingVoice(null);
      });
      return;
    }

    // Cache miss — synthesize from server
    setPreviewLoading(voiceId);

    synthesizeMutation.mutate(
      {
        text: sampleText,
        voice: voiceId,
        speed: "normal",
      },
      {
        onSuccess: (data) => {
          setPreviewLoading(null);
          setPreviewingVoice(voiceId);

          // Store in preview cache for instant replay
          previewCache.set(voiceId, {
            audioBase64: data.audioBase64,
            contentType: data.contentType,
          });

          const blob = base64ToBlob(data.audioBase64, data.contentType);
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;

          const audio = new Audio(url);
          previewAudioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(url);
            previewUrlRef.current = null;
            previewAudioRef.current = null;
            setPreviewingVoice(null);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            previewUrlRef.current = null;
            previewAudioRef.current = null;
            setPreviewingVoice(null);
          };

          audio.play().catch(() => {
            setPreviewingVoice(null);
          });
        },
        onError: () => {
          setPreviewLoading(null);
        },
      }
    );
  }, [stopPreview, synthesizeMutation]);

  /** Handle voice selection — also stop any preview */
  const handleVoiceChange = useCallback((val: string) => {
    stopPreview();
    onVoiceChange(val === "__default__" ? null : val);
  }, [stopPreview, onVoiceChange]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
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
              onValueChange={handleVoiceChange}
            >
              <SelectTrigger className="h-7 text-xs w-[160px] border-muted">
                <SelectValue placeholder="Default voice" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="__default__">Default voice</SelectItem>
                {filteredVoices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <span className="flex items-center gap-1.5">
                      <span>{voice.name}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {voice.gender === "Female" ? "♀" : "♂"}
                      </span>
                      {favoriteVoiceId === voice.id && (
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Voice preview cards with favorite star */}
      {filteredVoices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filteredVoices.map((voice) => {
            const isPreviewing = previewingVoice === voice.id;
            const isLoading = previewLoading === voice.id;
            const isSelected = selectedVoiceUri === voice.id;
            const isFavorite = favoriteVoiceId === voice.id;

            return (
              <div key={voice.id} className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-[11px] gap-1 transition-all rounded-r-none border-r-0",
                        isSelected && "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
                        isPreviewing && "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                      )}
                      onClick={() => {
                        if (isPreviewing) {
                          stopPreview();
                        } else {
                          playPreview(voice.id);
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isPreviewing ? (
                        <Square className="h-3 w-3 fill-current" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      <span>{voice.name}</span>
                      <span className="text-muted-foreground text-[9px]">
                        {voice.gender === "Female" ? "♀" : "♂"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{voice.name} — {voice.language}</p>
                    <p className="text-muted-foreground">{voice.description}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {isPreviewing ? "Click to stop" : "Click to preview"}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Favorite star button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 rounded-l-none transition-all",
                        isFavorite
                          ? "border-amber-400 bg-amber-50 text-amber-500 dark:bg-amber-950 dark:text-amber-400"
                          : "text-muted-foreground hover:text-amber-500",
                        isSelected && !isFavorite && "border-teal-500",
                      )}
                      onClick={() => toggleFavorite(voice.id)}
                    >
                      <Star
                        className={cn(
                          "h-3 w-3 transition-all",
                          isFavorite && "fill-amber-400"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isFavorite
                      ? "Remove from favorites"
                      : "Set as favorite (auto-selects on all courses)"}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}

      {/* Favorite voice indicator */}
      {favoriteVoiceId && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>
            Favorite voice: <strong>{voices.find(v => v.id === favoriteVoiceId)?.name || favoriteVoiceId}</strong>
            {" "}— auto-selected across all courses
          </span>
        </p>
      )}
    </div>
  );
}
