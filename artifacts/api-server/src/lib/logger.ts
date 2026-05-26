import pino from "pino";
import { env } from "../config/env";
import { initSentry } from "./sentry";

const isProduction = env.isProduction;

if (process.env.SENTRY_DSN) {
  try {
    initSentry();
  } catch (err) {
    // initialize logger below even if sentry init fails
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
