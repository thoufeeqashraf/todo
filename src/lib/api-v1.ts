import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { PlatformError } from '@/lib/platform-error';
import { API_V1_CATALOG, API_VERSION, isUserRole } from '@/lib/platform-rules';
import { isSupabaseConfigured } from '@/lib/supabase';
import * as tenant from '@/lib/services/tenant';

const roleSchema = z.enum(['admin', 'manager', 'user']);

function jsonError(error: unknown) {
  if (error instanceof PlatformError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...error.details } },
      { status: error.status },
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: { code: 'invalid', message: 'Invalid input.', issues: error.issues } },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: { code: 'internal', message: 'Internal server error.' } }, { status: 500 });
}

async function readActor(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (!token) throw new PlatformError('unauthorized', 'Bearer token is missing or expired.', 401);
  return tenant.actorFromToken(token);
}

async function body(request: NextRequest) {
  return (await request.json()) as unknown;
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
      const input = z.object({
        email: z.string().email(),
        password: z.string().min(1),
        companySlug: z.string().min(1).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.loginWithPassword(input.email, input.password, input.companySlug));
    }

    if (key === 'POST invitations/accept') {
      const input = z.object({
        token: z.string().min(10),
        password: z.string().min(8),
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
        description: z.string().optional(),
        assignedToId: z.string().uuid().nullable().optional(),
        dueDate: z.string().nullable().optional(),
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
      const input = z.object({ email: z.string().email(), role: roleSchema }).parse(await body(request));
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
        description: z.string().optional(),
        locationLabel: z.string().max(255).optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.createIncident(actor, input), { status: 201 });
    }
    if (key === 'GET schedules') return NextResponse.json(await tenant.listSchedules(actor));
    if (key === 'POST schedules') {
      const input = z.object({
        userId: z.string().uuid(),
        startTime: z.string().min(1),
        endTime: z.string().min(1),
        shiftType: z.enum(['regular', 'travel']).optional(),
        notes: z.string().optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.createSchedule(actor, input), { status: 201 });
    }
    if (key === 'POST geofences') {
      const input = z.object({
        name: z.string().min(1),
        lat: z.number(),
        lng: z.number(),
        radiusMeters: z.number().int().positive(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.saveGeofence(actor, input), { status: 201 });
    }
    if (key === 'POST attendance/travel-day') {
      const input = z.object({
        userId: z.string().uuid(),
        workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().min(1),
      }).parse(await body(request));
      return NextResponse.json(await tenant.grantTravelDay(actor, input), { status: 201 });
    }
    if (key === 'POST attendance/clock-in') {
      const input = z.object({ lat: z.number().optional(), lng: z.number().optional() }).parse(await body(request));
      return NextResponse.json(await tenant.clockIn(actor, input));
    }
    if (key === 'GET staff-health') return NextResponse.json(await tenant.staffHealth(actor, request.nextUrl.searchParams.get('userId') ?? undefined));
    if (key === 'POST staff-health') {
      const input = z.object({
        userId: z.string().uuid(),
        kind: z.enum(['miss', 'late', 'proof_rejected', 'complete']),
        note: z.string().optional(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.addStaffHealthEvent(actor, input), { status: 201 });
    }
    if (key === 'GET wallet') return NextResponse.json(await tenant.walletView(actor));
    if (key === 'POST wallet/adjustment') {
      const input = z.object({
        amountCents: z.number().int().positive(),
        direction: z.enum(['credit', 'debit']),
        memo: z.string().min(1),
      }).parse(await body(request));
      return NextResponse.json(await tenant.walletAdjustment(actor, input.amountCents, input.direction, input.memo), { status: 201 });
    }
    if (key === 'POST wallet/top-up') return NextResponse.json(await tenant.walletTopUp(actor), { status: 501 });
    if (key === 'GET pos/orders') return NextResponse.json(await tenant.listOrders(actor));
    if (key === 'POST pos/orders') {
      const input = z.object({
        tableLabel: z.string().min(1),
        items: z.array(z.object({ name: z.string(), qty: z.number().int().positive() })).default([]),
        totalCents: z.number().int().nonnegative(),
      }).parse(await body(request));
      return NextResponse.json(await tenant.createOrder(actor, input), { status: 201 });
    }
    if (key === 'GET cctv/cameras') return NextResponse.json(await tenant.listCameras(actor));
    if (key === 'POST cctv/cameras') {
      const input = z.object({ name: z.string().min(1), siteLabel: z.string().optional() }).parse(await body(request));
      return NextResponse.json(await tenant.createCamera(actor, input), { status: 201 });
    }
    if (key === 'GET mini-apps') return NextResponse.json(await tenant.listMiniApps(actor));
    if (key === 'GET locations') return NextResponse.json(await tenant.listLocations(actor));
    if (key === 'POST locations') {
      const input = z.object({ lat: z.number(), lng: z.number(), consent: z.literal(true) }).parse(await body(request));
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
