/**
 * PaletteContext — manages the user's colour palette preference.
 *
 * On mount it reads the stored palette from localStorage (for instant paint),
 * then once the user is authenticated it fetches the server-persisted value
 * and keeps both in sync.
 *
 * The active palette is applied as a class on <html>:
 *   palette-indigo | palette-emerald | palette-rose | palette-violet | palette-amber | palette-teal
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export type PaletteId = "indigo" | "emerald" | "rose" | "violet" | "amber" | "teal";

export interface PaletteOption {
  id: PaletteId;
  label: string;
  primary: string;   // preview swatch colour (Tailwind class)
  accent: string;    // secondary swatch
}

export const PALETTES: PaletteOption[] = [
  { id: "indigo",  label: "Deep Navy",     primary: "bg-indigo-900",  accent: "bg-amber-400"  },
  { id: "emerald", label: "Forest Green",  primary: "bg-emerald-700", accent: "bg-amber-400"  },
  { id: "rose",    label: "Warm Rose",     primary: "bg-rose-700",    accent: "bg-amber-400"  },
  { id: "violet",  label: "Royal Violet",  primary: "bg-violet-700",  accent: "bg-amber-400"  },
  { id: "amber",   label: "Golden Amber",  primary: "bg-amber-600",   accent: "bg-amber-200"  },
  { id: "teal",    label: "Ocean Teal",    primary: "bg-teal-600",    accent: "bg-amber-400"  },
];

const LS_KEY = "educhamp-palette";

interface PaletteContextType {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
  isSaving: boolean;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

function applyPalette(id: PaletteId) {
  const root = document.documentElement;
  // Remove all existing palette classes
  PALETTES.forEach((p) => root.classList.remove(`palette-${p.id}`));
  root.classList.add(`palette-${id}`);
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const stored = localStorage.getItem(LS_KEY) as PaletteId | null;
    return stored ?? "indigo";
  });

  // Apply palette class on mount and whenever palette changes
  useEffect(() => {
    applyPalette(palette);
  }, [palette]);

  // Fetch server-persisted palette once user is logged in
  const { data: personalization } = trpc.onboarding.getPersonalization.useQuery(undefined, {
    enabled: !!user,
  });

  // Sync server value → local state (only when it differs)
  useEffect(() => {
    if (personalization?.colorPalette) {
      const serverPalette = personalization.colorPalette as PaletteId;
      if (serverPalette !== palette) {
        setPaletteState(serverPalette);
        localStorage.setItem(LS_KEY, serverPalette);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalization?.colorPalette]);

  const savePalette = trpc.onboarding.savePersonalization.useMutation();

  const setPalette = useCallback(
    (id: PaletteId) => {
      setPaletteState(id);
      localStorage.setItem(LS_KEY, id);
      applyPalette(id);
      if (user) {
        savePalette.mutate({ colorPalette: id });
      }
    },
    [user, savePalette]
  );

  return (
    <PaletteContext.Provider value={{ palette, setPalette, isSaving: savePalette.isPending }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within PaletteProvider");
  return ctx;
}
