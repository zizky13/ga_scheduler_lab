import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { UserRole } from "../../generated/prisma/client.js";

/**
 * Role-based authorization factory.
 * Usage: router.post("/path", authenticate, authorize("ADMIN"), handler)
 *
 * @param roles - one or more UserRole values that are allowed to proceed.
 */
export function authorize(...roles: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Should not reach here if authenticate ran first, but guard anyway
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Required role: ${roles.join(" or ")}.`,
        },
      });
      return;
    }

    next();
  };
}
