import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserProfile, upsertUserProfile } from "../db";

export const ttsRouter = router({
  /**
   * Get TTS preferences for the current user.
   * Returns global defaults + per-subject overrides.
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      ttsEnabledDefault: profile?.ttsEnabledDefault ?? false,
      ttsSpeed: (profile?.ttsSpeed as "slow" | "normal" | "fast") ?? "normal",
      ttsSubjectOverrides: (profile?.ttsSubjectOverrides as Record<string, boolean> | null) ?? {},
      ttsFirstTimeTooltipShown: profile?.ttsFirstTimeTooltipShown ?? false,
      ttsVoiceUri: profile?.ttsVoiceUri ?? null,
    };
  }),

  /**
   * Update TTS preferences (partial — only send changed fields).
   */
  updatePreferences: protectedProcedure
    .input(z.object({
      ttsEnabledDefault: z.boolean().optional(),
      ttsSpeed: z.enum(["slow", "normal", "fast"]).optional(),
      ttsSubjectOverrides: z.record(z.string(), z.boolean()).optional(),
      ttsFirstTimeTooltipShown: z.boolean().optional(),
      ttsVoiceUri: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, any> = {};
      if (input.ttsEnabledDefault !== undefined) data.ttsEnabledDefault = input.ttsEnabledDefault;
      if (input.ttsSpeed !== undefined) data.ttsSpeed = input.ttsSpeed;
      if (input.ttsSubjectOverrides !== undefined) data.ttsSubjectOverrides = input.ttsSubjectOverrides;
      if (input.ttsFirstTimeTooltipShown !== undefined) data.ttsFirstTimeTooltipShown = input.ttsFirstTimeTooltipShown;
      if (input.ttsVoiceUri !== undefined) data.ttsVoiceUri = input.ttsVoiceUri;
      await upsertUserProfile(ctx.user.id, data);
      return { success: true };
    }),

  /**
   * Toggle TTS for a specific subject (merges into subject overrides).
   */
  toggleSubject: protectedProcedure
    .input(z.object({
      subjectName: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getUserProfile(ctx.user.id);
      const overrides = (profile?.ttsSubjectOverrides as Record<string, boolean> | null) ?? {};
      overrides[input.subjectName] = input.enabled;
      await upsertUserProfile(ctx.user.id, { ttsSubjectOverrides: overrides });
      return { success: true };
    }),
});
