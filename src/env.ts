import { z } from "zod";

const optionalTrimmed = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().min(1).default("file:./data/rasputin.db"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: optionalTrimmed,
  GOOGLE_CLIENT_SECRET: optionalTrimmed,
  RASPUTIN_ALLOWED_EMAILS: z.string().default(""),
  WINNOW_UPSTREAM: z.string().url(),
  WINNOW_UI_TOKEN: z.string().min(1),
  PREVIEW_PORTS: z.string().optional().default(""),
});

export type Env = z.infer<typeof schema> & {
  allowedEmails: Set<string>;
  previewPorts: number[];
  googleEnabled: boolean;
};

function parseEmailList(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parsePorts(raw: string): number[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10))
    .filter((port) => Number.isInteger(port) && port > 0 && port < 65536);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.parse({
    NODE_ENV: source.NODE_ENV,
    HOST: source.HOST,
    PORT: source.PORT,
    DATABASE_URL: source.DATABASE_URL,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: source.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: source.GOOGLE_CLIENT_SECRET,
    RASPUTIN_ALLOWED_EMAILS: source.RASPUTIN_ALLOWED_EMAILS,
    WINNOW_UPSTREAM: source.WINNOW_UPSTREAM,
    WINNOW_UI_TOKEN: source.WINNOW_UI_TOKEN,
    PREVIEW_PORTS: source.PREVIEW_PORTS,
  });

  const allowedEmails = parseEmailList(parsed.RASPUTIN_ALLOWED_EMAILS);
  const googleEnabled = Boolean(
    parsed.GOOGLE_CLIENT_ID && parsed.GOOGLE_CLIENT_SECRET,
  );

  if (parsed.NODE_ENV === "production") {
    if (allowedEmails.size === 0) {
      throw new Error(
        "RASPUTIN_ALLOWED_EMAILS must be a non-empty comma-separated list in production",
      );
    }
    if (!googleEnabled) {
      throw new Error(
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production",
      );
    }
  }

  return {
    ...parsed,
    allowedEmails,
    previewPorts: parsePorts(parsed.PREVIEW_PORTS),
    googleEnabled,
  };
}
