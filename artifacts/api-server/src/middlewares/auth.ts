import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { AppError } from "../lib/errors";

const JWT_SECRET = env.jwtSecret;

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  logger.info(`Auth header: ${authHeader ? "present" : "missing"}`);
  if (authHeader) {
    logger.info(
      `Auth header starts with Bearer: ${authHeader.startsWith("Bearer ")}`,
    );
    logger.info(`Auth header value: ${authHeader.substring(0, 50)}...`);
  }
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("No Bearer token found");
    next(new AppError(401, "UNAUTHORIZED", "Unauthorized"));
    return;
  }
  const token = authHeader.slice(7);
  logger.info(`Token extracted, length: ${token.length}`);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    logger.info(`JWT verification successful for user: ${payload.email}`);
    req.user = payload;
    next();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn({ error: err.message }, "Invalid JWT token");
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHORIZED", "Unauthorized"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "FORBIDDEN", "Forbidden"));
      return;
    }
    next();
  };
}

export function hasRole(
  userRole: string | undefined,
  ...roles: readonly string[]
): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}
