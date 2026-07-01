import { useState, useEffect, useMemo } from "react";
import { X, Download, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceDownloadPromptProps {
  /** The preferred voice URI that's missing from the system */
  preferredVoiceUri: string | null;
  /** Whether listen mode is currently enabled */
  listenModeEnabled: boolean;
}

/**
 * Detect the user's platform for platform-specific voice download instructions.
 */
function detectPlatform(): "macos" | "windows" | "chromeos" | "ios" | "android" | "linux" | "unknown" {
  const ua = navigator.userAgent.toLowerCase();
  if (/cros/.test(ua)) return "chromeos";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/linux/.test(ua)) return "linux";
  return "unknown";
}

const PLATFORM_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  macos: {
    title: "Download voices on macOS",
    steps: [
      "Open System Settings → Accessibility → Spoken Content",
      "Click \"System Voice\" dropdown → Manage Voices…",
      "Download enhanced or premium voices for your language",
      "Restart your browser after downloading",
    ],
  },
  windows: {
    title: "Download voices on Windows",
    steps: [
      "Open Settings → Time & Language → Speech",
      "Under \"Manage voices\", click \"Add voices\"",
      "Select your preferred language and download",
      "Restart your browser after installation",
    ],
  },
  chromeos: {
    title: "Download voices on ChromeOS",
    steps: [
      "Open Settings → Accessibility → Text-to-Speech",
      "Under \"Speech engine\", select Google TTS",
      "Install additional voice data from the Chrome Web Store",
      "Restart your browser after installation",
    ],
  },
  ios: {
    title: "Download voices on iOS",
    steps: [
      "Open Settings → Accessibility → Spoken Content → Voices",
      "Tap your language and download enhanced voices",
      "Wait for download to complete, then return to the app",
    ],
  },
  android: {
    title: "Download voices on Android",
    steps: [
      "Open Settings → Accessibility → Text-to-speech output",
      "Tap the gear icon next to your preferred engine",
      "Install additional voice data for your language",
      "Restart your browser after installation",
    ],
  },
  linux: {
    title: "Install voices on Linux",
    steps: [
      "Install espeak-ng or festival via your package manager",
      "For better quality, install mbrola voices",
      "Restart your browser after installation",
    ],
  },
  unknown: {
    title: "Download additional voices",
    steps: [
      "Check your system's accessibility or speech settings",
      "Look for an option to download additional voices",
      "Restart your browser after installation",
    ],
  },
};

/**
 * VoiceDownloadPrompt — shows a dismissible banner when the user's preferred
 * TTS voice is not available on their system, with platform-specific instructions
 * for downloading additional voices.
 */
export function VoiceDownloadPrompt({ preferredVoiceUri, listenModeEnabled }: VoiceDownloadPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const [voiceMissing, setVoiceMissing] = useState(false);

  const platform = useMemo(() => detectPlatform(), []);
  const instructions = PLATFORM_INSTRUCTIONS[platform] ?? PLATFORM_INSTRUCTIONS.unknown;

  useEffect(() => {
    if (!preferredVoiceUri || !listenModeEnabled) {
      setVoiceMissing(false);
      return;
    }

    // Check if the preferred voice is available
    const checkVoice = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return; // voices not loaded yet
      const found = voices.some((v) => v.voiceURI === preferredVoiceUri);
      setVoiceMissing(!found);
    };

    checkVoice();
    // Voices may load asynchronously
    speechSynthesis.addEventListener("voiceschanged", checkVoice);
    return () => speechSynthesis.removeEventListener("voiceschanged", checkVoice);
  }, [preferredVoiceUri, listenModeEnabled]);

  if (!voiceMissing || dismissed || !listenModeEnabled) return null;

  return (
    <div className="relative bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 text-amber-600 hover:text-amber-800"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-start gap-2 pr-6">
        <Download className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Preferred voice not found
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Your selected voice is not installed on this device. A default voice will be used instead.
          </p>

          <details className="group">
            <summary className="text-xs font-medium text-amber-700 dark:text-amber-300 cursor-pointer hover:underline flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              {instructions.title}
            </summary>
            <ol className="mt-1.5 ml-4 space-y-1 list-decimal text-xs text-amber-700 dark:text-amber-300">
              {instructions.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
