import rateLimit from "express-rate-limit";

export function makeLimiter(options: { windowMs: number; max: number; message?: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "OPTIONS" || req.path === "/health",
    message: {
      detail: options.message ?? "Too many requests. Please try again later.",
    },
  });
}
