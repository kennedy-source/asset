import type { NextFunction, Request, Response } from "express";

function isEnvelope(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  return Object.prototype.hasOwnProperty.call(payload, "success");
}

export function responseEnvelope(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (isEnvelope(body)) return originalJson(body);
    if (res.statusCode >= 400) {
      return originalJson({
        success: false,
        error: {
          code: "REQUEST_FAILED",
          message: typeof body === "string" ? body : "Request failed",
          details: typeof body === "string" ? undefined : body,
        },
      });
    }
    return originalJson({ success: true, data: body });
  }) as Response["json"];
  next();
}
