import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { errorBody } from '@/lib/api-error';
import { pageSlice, parsePageQuery } from '@/lib/pagination';
import { PlatformError } from '@/lib/platform-error';
import { API_VERSION, API_V1_CATALOG, gateApiRoute, isUserRole, matchApiRoute, transactionJunctionTopUp } from '@/lib/platform-rules';
import { clientAddress, consumeRateLimit, rateLimitPolicy, type RateLimitDecision } from '@/lib/rate-limit';
import { isSupabaseConfigured } from '@/lib/supabase';
import * as tenant from '@/lib/services/tenant';

const roleSchema = z.enum(['admin', 'manager', 'user']);

const pointSchema = z.object({
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
});

function changed<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Provide at least one field to change.',
  });
}

const taskPatchSchema = changed({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  dueDate: z.string().min(1).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'overdue']).optional(),
});

const staffPatchSchema = changed({
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

const schedulePatchSchema = changed({
  userId: z.string().uuid().optional(),
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  shiftType: z.enum(['regular', 'travel']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(['scheduled', 'started', 'completed', 'cancelled']).optional(),
});

const incidentPatchSchema = changed({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  locationLabel: z.string().max(255).nullable().optional(),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

function applyLimit(response: NextResponse, decision: RateLimitDecision) {
  response.headers.set('X-RateLimit-Limit', String(decision.limit));
  response.headers.set('X-RateLimit-Remaining', String(decision.remaining));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) throw new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401);
  return token;
}

async function readBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new PlatformError('invalid', 'Request body must be JSON.', 400);
  }
}

function page(request: NextRequest) {
  return parsePageQuery(request.nextUrl.searchParams);
}

function queryValue(request: NextRequest, name: string) {
  const value = request.nextUrl.searchParams.get(name);
  return value === null || value === '' ? undefined : value;
}

function optionalUserId(request: NextRequest) {
  return z.object({ userId: z.string().uuid().optional() }).parse({ userId: queryValue(request, 'userId') }).userId;
}

async function publicRoute(request: NextRequest, path: string[], method: string) {
  const key = `${method} ${path.join('/')}`;
  if (key === 'GET health') {
    return NextResponse.json({
      apiVersion: API_VERSION,
      supabaseConfigured: isSupabaseConfigured(),
      routes: API_V1_CATALOG,
    });
  }
  if (key === 'POST auth/login') {
    const input = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
        companySlug: z.string().min(1).optional(),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.loginWithPassword(input.email, input.password, input.companySlug));
  }
  if (key === 'POST invitations/accept') {
    const input = z
      .object({
        token: z.string().min(10),
        password: z.string().min(8),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.acceptInvitation(input), { status: 201 });
  }
  return NextResponse.json({ error: { code: 'not_found', message: 'Unknown API route.' } }, { status: 404 });
}

async function bearerRoute(request: NextRequest, path: string[], method: string, actor: tenant.TenantActor, token: string) {
  const key = `${method} ${path.join('/')}`;
  if (key === 'GET auth/me') {
    return NextResponse.json({
      user: { id: actor.userId, email: actor.email, role: actor.role, companyId: actor.companyId },
    });
  }
  if (key === 'POST auth/logout') return NextResponse.json(await tenant.revokeToken(actor, token));
  if (key === 'GET bootstrap') return NextResponse.json(await tenant.buildBootstrap(actor));

  if (key === 'GET tasks') {
    const status = z
      .object({ status: z.enum(['todo', 'in_progress', 'completed', 'overdue']).optional() })
      .parse({ status: queryValue(request, 'status') }).status;
    return NextResponse.json(await tenant.listTasksPage(actor, page(request), status));
  }
  if (key === 'POST tasks') {
    const input = z
      .object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        assignedToId: z.string().uuid().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.createTask(actor, input), { status: 201 });
  }
  if (path[0] === 'tasks' && path.length === 2) {
    const id = z.string().uuid().parse(path[1]);
    if (method === 'GET') return NextResponse.json(await tenant.getTask(actor, id));
    if (method === 'PATCH') return NextResponse.json(await tenant.updateTask(actor, id, taskPatchSchema.parse(await readBody(request))));
    if (method === 'DELETE') return NextResponse.json(await tenant.deleteTask(actor, id));
  }

  if (key === 'GET users' || key === 'GET staff') return NextResponse.json(await tenant.listUsersPage(actor, page(request)));
  if ((path[0] === 'users' || path[0] === 'staff') && path.length === 2) {
    const id = z.string().uuid().parse(path[1]);
    if (method === 'GET') return NextResponse.json(await tenant.getStaffMember(actor, id));
    if (method === 'PATCH') return NextResponse.json(await tenant.updateStaffMember(actor, id, staffPatchSchema.parse(await readBody(request))));
  }
  if (key === 'GET departments') return NextResponse.json(await tenant.listDepartmentsPage(actor, page(request)));
  if (key === 'POST departments') {
    const input = z
      .object({ name: z.string().min(1).max(255), parentId: z.string().uuid().nullable().optional() })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.createDepartment(actor, input.name, input.parentId), { status: 201 });
  }
  if (key === 'POST invitations') {
    const input = z.object({ email: z.string().email(), role: roleSchema }).parse(await readBody(request));
    return NextResponse.json(await tenant.createInvitation(actor, input.email, input.role), { status: 201 });
  }

  if (key === 'GET notifications') {
    const unread = z
      .object({ unread: z.enum(['true', 'false']).optional() })
      .parse({ unread: queryValue(request, 'unread') }).unread;
    return NextResponse.json(await tenant.listNotificationsPage(actor, page(request), unread === 'true'));
  }
  if (key === 'POST notifications/read') {
    const input = z.object({ id: z.string().uuid() }).parse(await readBody(request));
    return NextResponse.json(await tenant.markNotificationRead(actor, input.id));
  }
  if (key === 'POST notifications/read-all') return NextResponse.json(await tenant.markAllNotificationsRead(actor));

  if (key === 'GET audit') return NextResponse.json(await tenant.listAuditPage(actor, page(request)));

  if (key === 'GET incidents') {
    const status = z
      .object({ status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional() })
      .parse({ status: queryValue(request, 'status') }).status;
    return NextResponse.json(await tenant.listIncidentsPage(actor, page(request), status));
  }
  if (key === 'POST incidents') {
    const input = z
      .object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        locationLabel: z.string().max(255).optional(),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.createIncident(actor, input), { status: 201 });
  }
  if (path[0] === 'incidents' && path.length === 2) {
    const id = z.string().uuid().parse(path[1]);
    if (method === 'GET') return NextResponse.json(await tenant.getIncident(actor, id));
    if (method === 'PATCH') return NextResponse.json(await tenant.updateIncident(actor, id, incidentPatchSchema.parse(await readBody(request))));
  }

  if (key === 'GET schedules') return NextResponse.json(await tenant.listSchedulesPage(actor, page(request)));
  if (key === 'POST schedules') {
    const input = z
      .object({
        userId: z.string().uuid(),
        startTime: z.string().min(1),
        endTime: z.string().min(1),
        shiftType: z.enum(['regular', 'travel']).optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.createSchedule(actor, input), { status: 201 });
  }
  if (path[0] === 'schedules' && path.length === 2) {
    const id = z.string().uuid().parse(path[1]);
    if (method === 'GET') return NextResponse.json(await tenant.getSchedule(actor, id));
    if (method === 'PATCH') return NextResponse.json(await tenant.updateSchedule(actor, id, schedulePatchSchema.parse(await readBody(request))));
    if (method === 'DELETE') return NextResponse.json(await tenant.deleteSchedule(actor, id));
  }

  if (key === 'POST geofences') {
    const input = z
      .object({
        name: z.string().min(1).max(255),
        lat: z.number().gte(-90).lte(90),
        lng: z.number().gte(-180).lte(180),
        radiusMeters: z.number().int().positive().max(50_000),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.saveGeofence(actor, input), { status: 201 });
  }
  if (key === 'POST attendance/travel-day') {
    const input = z
      .object({
        userId: z.string().uuid(),
        workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().min(1).max(500),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.grantTravelDay(actor, input), { status: 201 });
  }
  if (key === 'GET attendance') return NextResponse.json(await tenant.listAttendance(actor, page(request), optionalUserId(request)));
  if (key === 'POST attendance/clock-in') return NextResponse.json(await tenant.clockIn(actor, pointSchema.parse(await readBody(request))));
  if (key === 'POST attendance/clock-out') return NextResponse.json(await tenant.clockOut(actor, pointSchema.parse(await readBody(request))));

  if (key === 'GET staff-health') {
    return NextResponse.json(pageSlice(await tenant.staffHealth(actor, optionalUserId(request)), page(request)));
  }
  if (key === 'POST staff-health') {
    const input = z
      .object({
        userId: z.string().uuid(),
        kind: z.enum(['miss', 'late', 'proof_rejected', 'complete']),
        note: z.string().max(500).optional(),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.addStaffHealthEvent(actor, input), { status: 201 });
  }

  if (key === 'GET wallet') {
    const view = await tenant.listWalletEntries(actor, page(request));
    return NextResponse.json({ ...view, topUp: transactionJunctionTopUp() });
  }
  if (key === 'GET wallet/entries') {
    return NextResponse.json(await tenant.listWalletEntries(actor, page(request), optionalUserId(request)));
  }
  if (key === 'POST wallet/adjustment') {
    const input = z
      .object({
        amountCents: z.number().int().positive(),
        direction: z.enum(['credit', 'debit']),
        memo: z.string().min(1).max(500),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.walletAdjustment(actor, input.amountCents, input.direction, input.memo), { status: 201 });
  }
  if (key === 'POST wallet/top-up') return NextResponse.json(await tenant.walletTopUp(actor), { status: 501 });

  if (key === 'GET pos/orders') return NextResponse.json(await tenant.listOrdersPage(actor, page(request)));
  if (key === 'POST pos/orders') {
    const input = z
      .object({
        tableLabel: z.string().min(1).max(100),
        items: z.array(z.object({ name: z.string().min(1).max(200), qty: z.number().int().positive().max(999) })).default([]),
        totalCents: z.number().int().nonnegative(),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.createOrder(actor, input), { status: 201 });
  }
  if (key === 'GET cctv/cameras') return NextResponse.json(await tenant.listCamerasPage(actor, page(request)));
  if (key === 'POST cctv/cameras') {
    const input = z.object({ name: z.string().min(1).max(255), siteLabel: z.string().max(255).optional() }).parse(await readBody(request));
    return NextResponse.json(await tenant.createCamera(actor, input), { status: 201 });
  }
  if (key === 'GET mini-apps') {
    const result = await tenant.listMiniApps(actor);
    const paged = pageSlice(result.installed, page(request));
    return NextResponse.json({ ...paged, marketplace: result.marketplace, provider: result.provider });
  }
  if (key === 'GET locations') return NextResponse.json(await tenant.listLocationsPage(actor, page(request)));
  if (key === 'POST locations') {
    const input = z
      .object({
        lat: z.number().gte(-90).lte(90),
        lng: z.number().gte(-180).lte(180),
        consent: z.literal(true),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.recordLocation(actor, input), { status: 201 });
  }
  if (key === 'GET reports/summary') return NextResponse.json(await tenant.reportSummary(actor));
  if (key === 'GET onboarding') return NextResponse.json(await tenant.onboarding(actor));
  if (key === 'GET settings') return NextResponse.json(await tenant.companySettings(actor));
  if (key === 'PATCH settings') {
    const input = z
      .object({
        name: z.string().min(2).max(255).optional(),
        region: z.enum(['za', 'eu', 'multi']).optional(),
      })
      .parse(await readBody(request));
    return NextResponse.json(await tenant.updateCompanySettings(actor, input));
  }

  if (!isUserRole(actor.role)) {
    throw new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401);
  }
  return NextResponse.json({ error: { code: 'not_found', message: 'Unknown API route.' } }, { status: 404 });
}

export async function dispatch(request: NextRequest, path: string[], method: string) {
  const policy = rateLimitPolicy(path);
  const limit = consumeRateLimit(`${clientAddress(request.headers)}:${policy.bucket}`, policy.limit, policy.windowMs);
  if (!limit.ok) {
    const response = NextResponse.json(
      { error: { code: 'rate_limited', message: 'Too many requests.', retryAfterSeconds: limit.retryAfterSeconds } },
      { status: 429 },
    );
    response.headers.set('Retry-After', String(limit.retryAfterSeconds));
    return applyLimit(response, limit);
  }
  try {
    const route = matchApiRoute(method, path);
    const response =
      route?.auth === 'none'
        ? await publicRoute(request, path, method)
        : await (async () => {
            const token = bearerToken(request);
            const actor = await tenant.actorFromToken(token);
            if (!route) {
              return NextResponse.json({ error: { code: 'not_found', message: 'Unknown API route.' } }, { status: 404 });
            }
            const enabled = route.module ? await tenant.enabledModuleNames(actor.companyId) : [];
            const decision = gateApiRoute(route, actor, enabled);
            if (!decision.ok) {
              throw new PlatformError(
                decision.code,
                decision.message,
                decision.status,
                decision.module ? { module: decision.module } : undefined,
              );
            }
            return bearerRoute(request, path, method, actor, token);
          })();
    return applyLimit(response, limit);
  } catch (error) {
    if (!(error instanceof PlatformError) && !(error instanceof z.ZodError)) console.error(error);
    const mapped = errorBody(error);
    return applyLimit(NextResponse.json(mapped.body, { status: mapped.status }), limit);
  }
}
