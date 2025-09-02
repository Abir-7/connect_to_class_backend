import rate_limit from "express-rate-limit";

// Basic global rate limiter (adjust as per your needs)
export const limiter = rate_limit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP per window
  standardHeaders: true, // Return rate limit info in the `rate_limit-*` headers
  legacyHeaders: false, // Disable `X-rate_limit-*` headers
  message: "Too many requests from this IP, please try again later",
});
