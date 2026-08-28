import pino from "pino";

export function createLogger(level = process.env.LOG_LEVEL ?? "info") {
  return pino({
    level,
    base: { service: "rasputin" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "password",
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.token",
        "*.secret",
      ],
      remove: true,
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
