import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import type { AuthSession } from "../auth/auth.js";
import { db, userProfiles } from "../db/index.js";

export type AuthRole = "admin" | "editor" | "viewer";

export type AuthProfile = Readonly<{
  userId: string;
  role: AuthRole;
  onboardingCompleted: boolean;
}>;

export type AppAuthContext = Readonly<
  AuthSession & {
    profile: AuthProfile | null;
  }
>;

declare module "express-serve-static-core" {
  interface Locals {
    auth: AppAuthContext;
  }
}

type SessionResult = AuthSession | null;

export type AuthDependencies = Readonly<{
  getSession: (headers: Headers) => Promise<SessionResult>;
  getProfile: (userId: string) => Promise<AuthProfile | null>;
}>;

function isAuthRole(value: string): value is AuthRole {
  return value === "admin" || value === "editor" || value === "viewer";
}

async function loadProfile(userId: string): Promise<AuthProfile | null> {
  const [profile] = await db
    .select({
      userId: userProfiles.userId,
      role: userProfiles.role,
      onboardingCompleted: userProfiles.onboardingCompleted,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile || !isAuthRole(profile.role)) return null;
  return {
    userId: profile.userId,
    role: profile.role,
    onboardingCompleted: profile.onboardingCompleted,
  };
}

export function createAuthMiddleware(dependencies: AuthDependencies): {
  requireSession: RequestHandler;
  requireAuth: RequestHandler;
  requireRole: (...allowedRoles: readonly AuthRole[]) => RequestHandler;
} {
  const requireSession: RequestHandler = async (req, res, next) => {
    try {
      const session = await dependencies.getSession(fromNodeHeaders(req.headers));
      if (!session) {
        res.status(401).json({ detail: "Not authenticated" });
        return;
      }

      const profile = await dependencies.getProfile(session.user.id);
      const authContext: AppAuthContext = { ...session, profile };
      res.locals.auth = authContext;
      next();
    } catch (error) {
      next(error);
    }
  };

  const requireAuth: RequestHandler = (req, res, next) => {
    requireSession(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      if (!res.locals.auth.profile?.onboardingCompleted) {
        res.status(403).json({
          code: "PROFILE_INCOMPLETE",
          detail: "Complete onboarding before accessing this resource",
        });
        return;
      }
      next();
    });
  };

  const requireRole =
    (...allowedRoles: readonly AuthRole[]): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
      requireAuth(req, res, (error?: unknown) => {
        if (error) {
          next(error);
          return;
        }
        const role = res.locals.auth.profile?.role;
        if (!role || !allowedRoles.includes(role)) {
          res.status(403).json({ detail: "Insufficient permissions" });
          return;
        }
        next();
      });
    };

  return { requireSession, requireAuth, requireRole };
}

type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
let activeMiddleware: AuthMiddleware | undefined;

function active(): AuthMiddleware {
  if (!activeMiddleware) throw new Error("Authentication middleware has not been bound");
  return activeMiddleware;
}

export function bindAuthMiddleware(dependencies: AuthDependencies): AuthMiddleware {
  if (activeMiddleware) throw new Error("Authentication middleware is already bound");
  activeMiddleware = createAuthMiddleware(dependencies);
  return activeMiddleware;
}

export const requireSession: RequestHandler = (req, res, next) =>
  active().requireSession(req, res, next);
export const requireAuth: RequestHandler = (req, res, next) => active().requireAuth(req, res, next);

export { loadProfile };
