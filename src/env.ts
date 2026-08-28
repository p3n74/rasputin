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
  SEED_OPERATOR_EMAIL: z.string().email().optional().or(z.literal("")),
  SEED_OPERATOR_PASSWORD: z.string().optional(),
  SEED_OPERATOR_NAME: z.string().default("Operator"),
});

export type Env = z.infer<typeof schema> & {
  allowedEmails: Set<string>;
  previewPorts: number[];
  googleEnabled: boolean;
  seedOperator:
    | { email: string; password: string; name: string }
    | undefined;
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
    SEED_OPERATOR_EMAIL: source.SEED_OPERATOR_EMAIL || undefined,
    SEED_OPERATOR_PASSWORD: source.SEED_OPERATOR_PASSWORD,
    SEED_OPERATOR_NAME: source.SEED_OPERATOR_NAME,
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

  const seedEmail = parsed.SEED_OPERATOR_EMAIL?.trim().toLowerCase();
  const seedPassword = parsed.SEED_OPERATOR_PASSWORD;
  let seedOperator: Env["seedOperator"];
  if (seedEmail && seedPassword) {
    if (seedPassword.length < 12) {
      throw new Error("SEED_OPERATOR_PASSWORD must be at least 12 characters");
    }
    seedOperator = {
      email: seedEmail,
      password: seedPassword,
      name: parsed.SEED_OPERATOR_NAME,
    };
  }

  return {
    ...parsed,
    allowedEmails,
    previewPorts: parsePorts(parsed.PREVIEW_PORTS),
    googleEnabled,
    seedOperator,
  };
}
