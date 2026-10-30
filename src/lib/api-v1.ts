import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PlatformError } from '@/lib/platform-error';
import { API_V1_CATALOG, API_VERSION, isUserRole } from '@/lib/platform-rules';
import {
  enforceAuthInvite,
  enforceAuthLogin,
  isIsoDateTime,
  isUuid,
  readJson,
  RequestGuardError,
} from '@/lib/request-guards';
import { isSupabaseConfigured } from '@/lib/supabase';
import * as tenant from '@/lib/services/tenant';

const roleSchema = z.enum(['admin', 'manager', 'user']);

function jsonError(error: unknown) {
  if (error instanceof RequestGuardError) {
    const code = error.status === 429 ? 'rate_limited' : error.status === 413 ? 'payload_too_large' : 'invalid';
    const headers = error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined;
    return NextResponse.json({ error: { code, message: error.message } }, { status: error.status, headers });
  }
  if (error instanceof PlatformError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...error.details } },
      { status: error.status },
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: { code: 'invalid', message: 'Invalid input.' } },
      { status: 400 },
    );
  }
  const summary = error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : 'unknown';
  console.error(summary);
  return NextResponse.json({ error: { code: 'internal', message: 'Internal server error.' } }, { status: 500 });
}

async function readActor(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) throw new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401);
  return tenant.actorFromToken(token);
}

async function body(request: NextRequest) {
  return readJson(request);
}

export async function dispatch(request: NextRequest, path: string[], method: string) {
  const key = `${method} ${path.join('/')}`;
  try {
    if (key === 'GET health') {
      return NextResponse.json({
        apiVersion: API_VERSION,
        supabaseConfigured: isSupabaseConfigured(),
        routes: API_V1_CATALOG,
      });
    }

    if (key === 'POST auth/login') {
      enforceAuthLogin(request);
      const input = z.object({
        email: z.string().email().max(255),
        password: z.string().min(1).max(200),
        companySlug: z.string().min(1).max(100).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.loginWithPassword(input.email, input.password, input.companySlug));
    }

    if (key === 'POST invitations/accept') {
      enforceAuthInvite(request);
      const input = z.object({
        token: z.string().min(10).max(200),
        password: z.string().min(8).max(200),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
      }).parse(await body(request));
      return NextResponse.json(await tenant.acceptInvitation(input), { status: 201 });
    }

    const actor = await readActor(request);

    if (key === 'GET bootstrap') return NextResponse.json(await tenant.buildBootstrap(actor));
    if (key === 'GET tasks') return NextResponse.json(await tenant.listTasks(actor));
    if (key === 'POST tasks') {
      const input = z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(4000).optional(),
        assignedToId: z.string().uuid().nullable().optional(),
        dueDate: z.union([z.string().max(40).refine(isIsoDateTime), z.null()]).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.createTask(actor, input), { status: 201 });
    }
    if (key === 'GET users') return NextResponse.json(await tenant.listUsers(actor));
    if (key === 'GET departments') return NextResponse.json(await tenant.listDepartments(actor));
    if (key === 'POST departments') {
      const input = z.object({ name: z.string().min(1).max(255), parentId: z.string().uuid().nullable().optional() }).parse(await body(request));
      return NextResponse.json(await tenant.createDepartment(actor, input.name, input.parentId), { status: 201 });
    }
    if (key === 'POST invitations') {
      const input = z.object({ email: z.string().email().max(255), role: roleSchema }).parse(await body(request));
      return NextResponse.json(await tenant.createInvitation(actor, input.email, input.role), { status: 201 });
    }
    if (key === 'GET notifications') return NextResponse.json(await tenant.listNotifications(actor));
    if (key === 'POST notifications/read') {
      const input = z.object({ id: z.string().uuid() }).parse(await body(request));
      return NextResponse.json(await tenant.markNotificationRead(actor, input.id));
    }
    if (key === 'GET audit') return NextResponse.json(await tenant.listAudit(actor));
    if (key === 'GET incidents') return NextResponse.json(await tenant.listIncidents(actor));
    if (key === 'POST incidents') {
      const input = z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(4000).optional(),
        locationLabel: z.string().max(255).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.createIncident(actor, input), { status: 201 });
    }
    if (key === 'GET schedules') return NextResponse.json(await tenant.listSchedules(actor));
    if (key === 'POST schedules') {
      const input = z.object({
        userId: z.string().uuid(),
        startTime: z.string().max(40).refine(isIsoDateTime),
        endTime: z.string().max(40).refine(isIsoDateTime),
        shiftType: z.enum(['regular', 'travel']).optional(),
        notes: z.string().max(2000).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.createSchedule(actor, input), { status: 201 });
    }
    if (key === 'POST geofences') {
      const input = z.object({
        name: z.string().min(1).max(255),
        lat: z.number().finite().min(-90).max(90),
        lng: z.number().finite().min(-180).max(180),
        radiusMeters: z.number().int().positive().max(1_000_000),
      }).parse(await body(request));
      return NextResponse.json(await tenant.saveGeofence(actor, input), { status: 201 });
    }
    if (key === 'POST attendance/travel-day') {
      const input = z.object({
        userId: z.string().uuid(),
        workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().min(1).max(2000),
      }).parse(await body(request));
      return NextResponse.json(await tenant.grantTravelDay(actor, input), { status: 201 });
    }
    if (key === 'POST attendance/clock-in') {
      const input = z.object({
        lat: z.number().finite().min(-90).max(90).optional(),
        lng: z.number().finite().min(-180).max(180).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.clockIn(actor, input));
    }
    if (key === 'GET staff-health') {
      const userId = request.nextUrl.searchParams.get('userId');
      if (userId && !isUuid(userId)) throw new RequestGuardError(400, 'Invalid input data');
      return NextResponse.json(await tenant.staffHealth(actor, userId ?? undefined));
    }
    if (key === 'POST staff-health') {
      const input = z.object({
        userId: z.string().uuid(),
        kind: z.enum(['miss', 'late', 'proof_rejected', 'complete']),
        note: z.string().max(2000).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.addStaffHealthEvent(actor, input), { status: 201 });
    }
    if (key === 'GET wallet') return NextResponse.json(await tenant.walletView(actor));
    if (key === 'POST wallet/adjustment') {
      const input = z.object({
        amountCents: z.number().int().positive().max(2_000_000_000),
        direction: z.enum(['credit', 'debit']),
        memo: z.string().min(1).max(500),
      }).parse(await body(request));
      return NextResponse.json(await tenant.walletAdjustment(actor, input.amountCents, input.direction, input.memo), { status: 201 });
    }
    if (key === 'POST wallet/top-up') return NextResponse.json(await tenant.walletTopUp(actor), { status: 501 });
    if (key === 'GET pos/orders') return NextResponse.json(await tenant.listOrders(actor));
    if (key === 'POST pos/orders') {
      const input = z.object({
        tableLabel: z.string().min(1).max(100),
        items: z.array(z.object({ name: z.string().min(1).max(255), qty: z.number().int().positive().max(10_000) })).default([]),
        totalCents: z.number().int().nonnegative().max(2_000_000_000),
      }).parse(await body(request));
      return NextResponse.json(await tenant.createOrder(actor, input), { status: 201 });
    }
    if (key === 'GET cctv/cameras') return NextResponse.json(await tenant.listCameras(actor));
    if (key === 'POST cctv/cameras') {
      const input = z.object({ name: z.string().min(1).max(255), siteLabel: z.string().max(255).optional() }).parse(await body(request));
      return NextResponse.json(await tenant.createCamera(actor, input), { status: 201 });
    }
    if (key === 'GET mini-apps') return NextResponse.json(await tenant.listMiniApps(actor));
    if (key === 'GET locations') return NextResponse.json(await tenant.listLocations(actor));
    if (key === 'POST locations') {
      const input = z.object({
        lat: z.number().finite().min(-90).max(90),
        lng: z.number().finite().min(-180).max(180),
        consent: z.literal(true),
      }).parse(await body(request));
      return NextResponse.json(await tenant.recordLocation(actor, input), { status: 201 });
    }
    if (key === 'GET reports/summary') return NextResponse.json(await tenant.reportSummary(actor));
    if (key === 'GET onboarding') return NextResponse.json(await tenant.onboarding(actor));
    if (key === 'GET settings') return NextResponse.json(await tenant.companySettings(actor));
    if (key === 'PATCH settings') {
      const input = z.object({
        name: z.string().min(2).max(255).optional(),
        region: z.enum(['za', 'eu', 'multi']).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.updateCompanySettings(actor, input));
    }

    if (!isUserRole(actor.role)) {
      return jsonError(new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401));
    }
    return NextResponse.json({ error: { code: 'not_found', message: 'Unknown API route.' } }, { status: 404 });
  } catch (error) {
    return jsonError(error);
  }
}
