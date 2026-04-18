# Implementation Plan

## P1 – Security-Headers & Admin-Middleware

- [x] 1. Add security headers to next.config.ts
  - Modify `next.config.ts` to add an `async headers()` function
  - Add headers for all routes via `source: "/(.*)"`:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
    - `Content-Security-Policy` with: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.genius.com; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'`
  - Verify no TypeScript errors in `next.config.ts`
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Expand admin route protection in middleware
  - Modify `middleware.ts`:
    - Replace `const adminApiPrefix = "/api/users"` with `const adminApiPrefixes = ["/api/users", "/api/admin", "/api/settings", "/api/server-errors", "/api/audit-log"]`
    - Update `isAdminRoute()` to check `adminApiPrefixes.some((prefix) => pathname.startsWith(prefix))`
  - Verify no TypeScript errors
  - Existing `getAdminSession()` checks in route handlers remain unchanged (Defense-in-Depth)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. Add CORS handling to middleware
  - Add `getAllowedOrigin()` helper that reads `process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"`
  - Add `addCorsHeaders(response, origin)` helper that sets `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` when origin matches
  - Add OPTIONS preflight early-return in the middleware auth handler: if `req.method === "OPTIONS" && isApiRoute(pathname)`, return `new NextResponse(null, { status: 204 })` with CORS headers
  - Apply CORS headers to all API responses via `addCorsHeaders` before returning `NextResponse.next()`
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 4. Verify P1 changes — run existing tests
  - Run `npx vitest run` to ensure no regressions from header, middleware, and CORS changes
  - Specifically verify admin API tests still pass (`__tests__/admin/`)
  - Specifically verify auth tests still pass (`__tests__/auth/`)
  - _Requirements: 4.3, 5.3_

## P2 – Setup Race Condition, Audit-Log IP

- [x] 5. Fix setup race condition with serializable transaction
  - Modify `src/lib/services/setup-service.ts`:
    - Wrap `createInitialAdmin()` body in `prisma.$transaction(async (tx) => { ... }, { isolationLevel: "Serializable" })`
    - Move admin count check inside the transaction: `const adminCount = await tx.user.count({ where: { role: "ADMIN" } })`
    - If `adminCount > 0`, throw `"Setup wurde bereits abgeschlossen"`
    - Use `tx.user.create()` instead of `prisma.user.create()` inside the transaction
  - Keep `isSetupRequired()` as a separate non-transactional function (used for GET status check)
  - Verify no TypeScript errors
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Create IP extraction utility
  - Create `src/lib/utils/request-ip.ts`
  - Implement `getClientIp(request: NextRequest): string`
  - Extraction order: `x-forwarded-for` header (first value, trimmed) → `x-real-ip` header → fallback `"unknown"`
  - _Requirements: 6.2_

- [x] 7. Add IP address to audit log calls in route handlers
  - Import `getClientIp` from `@/lib/utils/request-ip` in each affected route file
  - Add `ipAddress: getClientIp(request)` to each `logAudit()` call in:
    - `src/app/api/users/route.ts` — USER_CREATED (the POST handler has `request` param)
    - `src/app/api/users/[id]/route.ts` — USER_UPDATED (PUT), USER_DELETED (DELETE)
    - `src/app/api/users/[id]/status/route.ts` — ACCOUNT_STATUS_CHANGED
    - `src/app/api/settings/theme/route.ts` — SETTING_CHANGED
    - `src/app/api/settings/require-approval/route.ts` — SETTING_CHANGED
  - Note: Login audit calls in `src/lib/auth.ts` are skipped (no request access in authorize callback) — follow-up task
  - Verify no TypeScript errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Verify P2 changes — run existing tests
  - Run `npx vitest run __tests__/admin/` to verify admin/user tests pass
  - Run `npx vitest run __tests__/auth/` to verify auth tests pass
  - _Requirements: 3.3, 6.4_

## P3 – Upload Rate-Limiting, JWT-Härtung

- [x] 9. Create upload rate limiter service
  - Create `src/lib/services/upload-rate-limiter.ts`
  - Implement `checkUploadRateLimit(userId: string): { allowed: boolean; retryAfter?: number }`
  - Use in-memory Map with userId → timestamp array
  - Limit: 20 uploads per 15-minute window
  - Clean up expired timestamps on each check
  - Return `retryAfter` in seconds when limit exceeded
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 10. Integrate rate limiter into upload routes
  - Modify `src/app/api/songs/[id]/audio-quellen/upload/route.ts`:
    - Import `checkUploadRateLimit` from `@/lib/services/upload-rate-limiter`
    - After auth check, before file processing: call `checkUploadRateLimit(session.user.id)`
    - If not allowed: return 429 with `{ error: "Zu viele Uploads. Bitte warten." }` and `Retry-After` header
  - Modify `src/app/api/songs/[id]/cover/upload/route.ts`:
    - Same pattern as audio upload
  - Verify no TypeScript errors
  - _Requirements: 7.1, 7.2_

- [x] 11. Reduce JWT updateAge for faster session refresh
  - Modify `src/lib/auth.config.ts`:
    - Change `updateAge: 60 * 5` to `updateAge: 60`
  - This reduces the window for stale accountStatus from 5 minutes to 60 seconds
  - No DB access in JWT callback (Edge-compatibility constraint)
  - _Requirements: 8.1_

- [x] 12. Final checkpoint — run full test suite
  - Run `npx vitest run` to ensure all tests pass
  - Verify no regressions across the entire project
  - _Requirements: 3.3, 4.3, 5.3, 6.4_
