/**
 * Log-Service: Schreibt und liest Audit-Log- und Server-Fehler-Log-Einträge.
 * Requirements: 1.1–1.6, 2.1–2.4, 3.1–3.6, 4.1–4.6
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Aktionstyp-Konstanten
// ---------------------------------------------------------------------------

export const LOGIN_SUCCESS = "LOGIN_SUCCESS";
export const LOGIN_FAILED = "LOGIN_FAILED";
export const USER_CREATED = "USER_CREATED";
export const USER_UPDATED = "USER_UPDATED";
export const USER_DELETED = "USER_DELETED";
export const SETTING_CHANGED = "SETTING_CHANGED";
export const ACCOUNT_STATUS_CHANGED = "ACCOUNT_STATUS_CHANGED";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string | null;
  targetEntity: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor?: { id: string; name: string | null; email: string } | null;
}

export interface LogAuditParams {
  action: string;
  actorId?: string;
  targetEntity?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface ServerErrorEntry {
  id: string;
  severity: "ERROR" | "WARN" | "FATAL";
  message: string;
  stackTrace: string | null;
  apiPath: string | null;
  httpMethod: string | null;
  statusCode: number | null;
  userId: string | null;
  createdAt: string;
}

export interface LogServerErrorParams {
  severity: "ERROR" | "WARN" | "FATAL";
  message: string;
  stackTrace?: string;
  apiPath?: string;
  httpMethod?: string;
  statusCode?: number;
  userId?: string;
}

export interface PaginatedResponse<T> {
  entries: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Log-Schreibfunktionen (Fire-and-Forget)
// ---------------------------------------------------------------------------

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        details: (params.details ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export async function logServerError(params: LogServerErrorParams): Promise<void> {
  try {
    await prisma.serverError.create({
      data: {
        severity: params.severity,
        message: params.message,
        stackTrace: params.stackTrace,
        apiPath: params.apiPath,
        httpMethod: params.httpMethod,
        statusCode: params.statusCode,
        userId: params.userId,
      },
    });
  } catch (error) {
    console.error("Failed to write server error log:", error);
  }
}

// ---------------------------------------------------------------------------
// Log-Lesefunktionen (Paginiert)
// ---------------------------------------------------------------------------

export async function getAuditLogs({
  page,
  limit,
  action,
}: {
  page: number;
  limit: number;
  action?: string;
}): Promise<PaginatedResponse<AuditLogEntry>> {
  const where = action ? { action } : {};
  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    entries: entries.map((e) => ({
      ...e,
      details: (e.details as Record<string, unknown>) ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getServerErrors({
  page,
  limit,
  severity,
}: {
  page: number;
  limit: number;
  severity?: string;
}): Promise<PaginatedResponse<ServerErrorEntry>> {
  const where = severity ? { severity: severity as "ERROR" | "WARN" | "FATAL" } : {};
  const [entries, total] = await Promise.all([
    prisma.serverError.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.serverError.count({ where }),
  ]);
  return {
    entries: entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}
