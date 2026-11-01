import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyseTranscript } from "./rehearsal/analyse";
import { transcribeRecordedAudio } from "./rehearsal/transcribe";

const rateWindows = new Map<string, number[]>();

function enforceRateLimit(key: string) {
  const now = Date.now();
  const recent = (rateWindows.get(key) ?? []).filter((timestamp) => timestamp > now - 900_000);
  if (recent.length >= 6) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before submitting another recording." });
  recent.push(now);
  rateWindows.set(key, recent);
}

const analysisInput = z.object({
  audioBase64: z.string().min(172).max(24_000_000),
  mimeType: z.enum(["audio/m4a", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"]),
  expectedText: z.string().min(1).max(60_000),
  sections: z.array(z.string().max(15_000)).min(1).max(500),
  fillerWords: z.array(z.string().min(1).max(40)).max(50),
  retries: z.record(z.string(), z.number().int().min(0).max(50)).default({}),
  revealed: z.array(z.number().int().min(0).max(499)).max(500).default([]),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((options) => options.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  rehearsal: router({
    transcribeAndAnalyze: publicProcedure.input(analysisInput).mutation(async ({ input, ctx }) => {
      enforceRateLimit(`${ctx.req.ip || ctx.req.socket.remoteAddress || "unknown"}:transcribe`);
      const bytes = Buffer.from(input.audioBase64, "base64");
      if (bytes.byteLength < 128 || bytes.byteLength > 16 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Recording must be smaller than 16 MB." });
      }
      try {
        const transcript = await transcribeRecordedAudio({
          bytes,
          mimeType: input.mimeType,
          prompt: `Speech rehearsal. Expected opening: ${input.expectedText.slice(0, 350)}`,
          language: "en",
        });
        const retryMap = Object.fromEntries(Object.entries(input.retries).map(([key, value]) => [Number(key), value]));
        return analyseTranscript({
          expectedText: input.expectedText,
          sections: input.sections,
          fillerWords: input.fillerWords,
          retries: retryMap,
          revealed: new Set(input.revealed),
        }, transcript);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "The recording could not be analysed." });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
