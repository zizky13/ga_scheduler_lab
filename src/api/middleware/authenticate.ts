import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/authService.js";
import { prisma } from "../../db/client.js";
import type { UserRole } from "../../generated/prisma/client.js";

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: UserRole;
      };
    }
  }
}

/**
 * Verifies the Bearer token in the Authorization header.
 * On success, attaches `req.user = { id, role }`.
 * On failure, responds with 401.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or malformed Authorization header." },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Verify the user still exists and is active in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Account not found or disabled." },
      });
      return;
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired access token." },
    });
  }
}
