import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

import { POST as checkout } from '@/app/api/billing/checkout/route';
import { POST as loginRoute } from '@/app/api/auth/customer-login/route';
import { POST as signupRoute } from '@/app/api/auth/signup/route';
import { GET as listTasksRoute, POST as createTaskRoute } from '@/app/api/tasks/route';
import { loadModule } from '@/app/customer/actions';
import { loadAnalytics } from '@/components/analytics/load';
import { loadClients, loadInbox, loadProjects } from '@/components/expansion/queries';
import {
  gateModule,
  loadAttendance,
  loadCameras,
  loadFindStaff,
  loadHealth,
  loadIncidents,
  loadOrders,
  loadWallet,
  readModule,
} from '@/components/modules/load';
import { formatStamp, homeFeedPlan, taskSparkline, taskStatusSeries } from '@/lib/customer-home-summary';
import { dispatch } from '@/lib/api-v1';
import { PlatformError } from '@/lib/platform-error';
import { resetRateLimits as resetApiLimits } from '@/lib/rate-limit';
import { CUSTOMER_SESSION_COOKIE, hashToken, resetRateLimits as resetGuardLimits } from '@/lib/request-guards';
import {
  acceptInvitation,
  createTask,
  loginWithPassword,
  onboarding,
  updateTask,
  type TenantActor,
} from '@/lib/services/tenant';
import { resetTestCookies, setTestCookie } from './stubs/next-headers';
import { recordedCalls, resetSupabaseMock, rows, seed } from './stubs/supabase';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const FLOOR = '44444444-4444-4444-8444-444444444444';
const OTHER_USER = '55555555-5555-4555-8555-555555555555';
const TASK = '66666666-6666-4666-8666-666666666666';
const OTHER_TASK = '77777777-7777-4777-8777-777777777777';
const INDUSTRY = '88888888-8888-4888-8888-888888888888';
const ADMIN_TOKEN = 'a'.repeat(43);
const FLOOR_TOKEN = 'b'.repeat(43);
const passwordHash = bcrypt.hashSync('correct-horse', 4);

const admin: TenantActor = { userId: USER, companyId: COMPANY, role: 'admin', email: 'ada@example.com' };
const floor: TenantActor = { userId: FLOOR, companyId: COMPANY, role: 'user', email: 'lee@example.com' };

function company(id: string, slug: string, name: string) {
  seed('companies', [{ id, name, slug, region: 'za', settings: {}, industry_id: null }]);
}

function user(input: { id: string; companyId: string; email: string; role: 'admin' | 'manager' | 'user'; token?: string; password?: unknown }) {
  seed('users', [{
    id: input.id,
    company_id: input.companyId,
    email: input.email,
    password_hash: input.password === undefined ? passwordHash : input.password,
    first_name: 'Ada',
    last_name: 'Lane',
    role: input.role,
    is_active: true,
  }]);
  if (input.token) {
    seed('api_tokens', [{
      company_id: input.companyId,
      user_id: input.id,
      token_hash: hashToken(input.token),
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    }]);
    setTestCookie(CUSTOMER_SESSION_COOKIE, input.token);
  }
}

function enable(companyId: string, name: string) {
  const moduleId = crypto.randomUUID();
  seed('modules', [{ id: moduleId, name, display_name: name }]);
  seed('company_modules', [{
    id: crypto.randomUUID(),
    company_id: companyId,
    module_id: moduleId,
    is_enabled: true,
    settings: {},
  }]);
}

function post(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetSupabaseMock();
  resetTestCookies();
  resetGuardLimits();
  resetApiLimits();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PRICE_STARTER;
});

describe('signed-in paths with a mocked supabase client', () => {
  it('rejects a missing or unusable password hash instead of throwing', async () => {
    company(COMPANY, 'north', 'North Kitchen');
    user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', password: null });
    user({ id: FLOOR, companyId: COMPANY, email: 'lee@example.com', role: 'user', password: '$2b$04$not-a-valid-bcrypt-hash' });
    await assert.rejects(() => loginWithPassword('ada@example.com', 'correct-horse'), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.status, 401);
      return true;
    });
    const response = await loginRoute(post('http://localhost/api/auth/customer-login', {
      email: 'lee@example.com',
      password: 'correct-horse',
    }));
    assert.equal(response.status, 401);
  });

  it('asks for a company when one email matches two tenants, then issues that tenant token', async () => {
    company(COMPANY, 'north', 'North Kitchen');
    company(OTHER, 'south', 'South Kitchen');
    user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin' });
    user({ id: OTHER_USER, companyId: OTHER, email: 'ada@example.com', role: 'admin' });
    await assert.rejects(() => loginWithPassword('ada@example.com', 'correct-horse'), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.status, 409);
      assert.equal(error.code, 'company_required');
      return true;
    });
    const session = await loginWithPassword('ada@example.com', 'correct-horse', 'south');
    assert.equal(typeof session.token, 'string');
    assert.equal(rows('api_tokens').some((row) => row.company_id === OTHER), true);
    assert.equal(rows('api_tokens').some((row) => row.company_id === COMPANY), false);
  });

  it('signs up the first admin inside the new company and enables that industry defaults', async () => {
    seed('industries', [{ id: INDUSTRY, name: 'restaurant', display_name: 'Restaurant', default_modules: ['tasks', 'staff'] }]);
    seed('modules', [
      { id: '99999999-9999-4999-8999-999999999999', name: 'tasks', display_name: 'Tasks' },
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', name: 'staff', display_name: 'Staff' },
    ]);
    const response = await signupRoute(post('http://localhost/api/auth/signup', {
      companyName: 'North Kitchen',
      industryId: INDUSTRY,
      email: 'ada@example.com',
      password: 'correct-horse',
      firstName: 'Ada',
      lastName: 'Lane',
      region: 'za',
    }));
    assert.equal(response.status, 201);
    const body = await response.json() as { company: { id: string }; user: { email: string } };
    const created = rows('users').find((row) => row.email === 'ada@example.com');
    assert.equal(created?.company_id, body.company.id);
    assert.equal(created?.role, 'admin');
    assert.equal(rows('companies').some((row) => row.id === OTHER), false);
    const enabled = rows('company_modules').filter((row) => row.company_id === body.company.id && row.is_enabled === true);
    assert.equal(enabled.length, 2);
  });

  it('returns 400 when the industry catalogue is empty', async () => {
    const response = await signupRoute(post('http://localhost/api/auth/signup', {
      companyName: 'North Kitchen',
      industryId: INDUSTRY,
      email: 'ada@example.com',
      password: 'correct-horse',
      firstName: 'Ada',
      lastName: 'Lane',
    }));
    assert.equal(response.status, 400);
    assert.equal(rows('companies').length, 0);
    assert.equal(rows('users').length, 0);
  });

  it('accepts a live invitation into that company and rejects a null expiry', async () => {
    company(COMPANY, 'north', 'North Kitchen');
    enable(COMPANY, 'staff');
    seed('invitations', [{
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      company_id: COMPANY,
      email: 'new@example.com',
      role: 'user',
      status: 'pending',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      token: hashToken('invite-token-value'),
    }]);
    const created = await acceptInvitation({
      token: 'invite-token-value',
      password: 'correct-horse',
      firstName: 'New',
      lastName: 'Hire',
    });
    assert.equal(created.email, 'new@example.com');
    assert.equal(rows('users').find((row) => row.email === 'new@example.com')?.company_id, COMPANY);
    assert.equal(rows('invitations')[0]?.status, 'accepted');

    resetSupabaseMock();
    company(COMPANY, 'north', 'North Kitchen');
    enable(COMPANY, 'staff');
    seed('invitations', [{
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      company_id: COMPANY,
      email: 'late@example.com',
      role: 'user',
      status: 'pending',
      expires_at: null,
      token: hashToken('second-invite-token'),
    }]);
    await assert.rejects(() => acceptInvitation({
      token: 'second-invite-token',
      password: 'correct-horse',
      firstName: 'Late',
      lastName: 'Hire',
    }), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.status, 410);
      return true;
    });
    assert.equal(rows('users').length, 0);
  });

  it('does not accept an invitation when staff is off', async () => {
    company(COMPANY, 'north', 'North Kitchen');
    seed('invitations', [{
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      company_id: COMPANY,
      email: 'new@example.com',
      role: 'user',
      status: 'pending',
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      token: hashToken('invite-token-value'),
    }]);
    await assert.rejects(() => acceptInvitation({
      token: 'invite-token-value',
      password: 'correct-horse',
      firstName: 'New',
      lastName: 'Hire',
    }), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.code, 'module_disabled');
      return true;
    });
    assert.equal(rows('users').length, 0);
  });

  it('creates and updates tasks inside the caller company only', async () => {
    company(COMPANY, 'north', 'North Kitchen');
    company(OTHER, 'south', 'South Kitchen');
    user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', token: ADMIN_TOKEN });
    user({ id: FLOOR, companyId: COMPANY, email: 'lee@example.com', role: 'user', token: FLOOR_TOKEN });
    user({ id: OTHER_USER, companyId: OTHER, email: 'other@example.com', role: 'user' });
    enable(COMPANY, 'tasks');
    seed('tasks', [
      { id: TASK, company_id: COMPANY, title: 'Own', status: 'todo', assigned_to_id: FLOOR, assigned_by_id: FLOOR },
      { id: OTHER_TASK, company_id: OTHER, title: 'Foreign', status: 'todo', assigned_to_id: OTHER_USER, assigned_by_id: OTHER_USER },
    ]);

    const created = await createTask(admin, { title: 'Prep line', assignedToId: USER });
    assert.equal(rows('tasks').find((row) => row.id === created.id)?.company_id, COMPANY);
    await assert.rejects(() => createTask(admin, { title: 'Leak', assignedToId: OTHER_USER }), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.status, 404);
      return true;
    });

    const updated = await updateTask(floor, TASK, { title: 'Own renamed', status: 'in_progress' });
    assert.equal(updated.title, 'Own renamed');
    assert.equal(rows('tasks').find((row) => row.id === TASK)?.company_id, COMPANY);
    await assert.rejects(() => updateTask(admin, OTHER_TASK, { title: 'Stolen' }), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.status, 404);
      return true;
    });
    assert.equal(rows('tasks').find((row) => row.id === OTHER_TASK)?.title, 'Foreign');

    setTestCookie(CUSTOMER_SESSION_COOKIE, FLOOR_TOKEN);
    const listed = await listTasksRoute(new NextRequest('http://localhost/api/tasks'));
    assert.equal(listed.status, 200);
    const body = await listed.json() as { id: string }[];
    assert.deepEqual(body.map((row) => row.id), [TASK]);

    setTestCookie(CUSTOMER_SESSION_COOKIE, ADMIN_TOKEN);
    const blocked = await createTaskRoute(post('http://localhost/api/tasks', {
      title: 'Not yours',
      assigned_to_id: OTHER_USER,
    }));
    assert.equal(blocked.status, 404);
  });

  it('lists an empty task table and hides tasks when the module is off', async () => {
    company(COMPANY, 'north', 'North Kitchen');
    user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', token: ADMIN_TOKEN });
    enable(COMPANY, 'tasks');
    const empty = await listTasksRoute(new NextRequest('http://localhost/api/tasks'));
    assert.equal(empty.status, 200);
    assert.deepEqual(await empty.json(), []);

    resetSupabaseMock();
    resetTestCookies();
    company(COMPANY, 'north', 'North Kitchen');
    user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', token: ADMIN_TOKEN });
    const denied = await listTasksRoute(new NextRequest('http://localhost/api/tasks'));
    assert.equal(denied.status, 403);
    assert.equal(recordedCalls().some((call) => call.table === 'tasks'), false);
  });

  it('gates every customer module loader and still reads an empty table', async () => {
    const screens = [
      ['incidents', 'incidents', loadIncidents],
      ['geofence_attendance', 'attendance', loadAttendance],
      ['staff_health', 'staff_health_events', loadHealth],
      ['wallet', 'wallet_accounts', loadWallet],
      ['find_my_staff', 'staff_locations', loadFindStaff],
      ['pos', 'pos_orders', loadOrders],
      ['cctv', 'cameras', loadCameras],
    ] as const;

    for (const [moduleName, table] of screens) {
      resetSupabaseMock();
      resetTestCookies();
      company(COMPANY, 'north', 'North Kitchen');
      user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', token: ADMIN_TOKEN });
      const closed = await gateModule(moduleName);
      assert.equal(closed.ok, false);
      assert.equal(recordedCalls().some((call) => call.table === table), false);
    }

    for (const [moduleName, , load] of screens) {
      resetSupabaseMock();
      resetTestCookies();
      company(COMPANY, 'north', 'North Kitchen');
      user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', token: ADMIN_TOKEN });
      enable(COMPANY, moduleName);
      const opened = await gateModule(moduleName);
      assert.equal(opened.ok, true);
      if (!opened.ok) continue;
      const loaded = await load(opened.actor);
      assert.ok(loaded);
    }

    company(COMPANY, 'north', 'North Kitchen');
    user({ id: FLOOR, companyId: COMPANY, email: 'lee@example.com', role: 'user', token: FLOOR_TOKEN });
    enable(COMPANY, 'staff_health');
    const health = await readModule(() => loadHealth(floor));
    assert.equal(health.data, null);
    assert.match(health.error ?? '', /managers and admins/);

    const slugs = [
      ['staff', 'staff'],
      ['scheduling', 'scheduling'],
      ['incidents', 'incidents'],
      ['attendance', 'geofence_attendance'],
      ['health', 'staff_health'],
      ['wallet', 'wallet'],
      ['pos', 'pos'],
      ['cctv', 'cctv'],
      ['mini-apps', 'mini_apps'],
      ['find', 'find_my_staff'],
      ['notifications', 'notifications'],
      ['reports', 'reports'],
    ] as const;
    for (const [slug, moduleName] of slugs) {
      resetSupabaseMock();
      resetTestCookies();
      company(COMPANY, 'north', 'North Kitchen');
      user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', token: ADMIN_TOKEN });
      const blocked = await loadModule(slug);
      assert.equal(blocked.ok, false);
      if (!blocked.ok) assert.equal(blocked.code, 'module_disabled');
      enable(COMPANY, moduleName);
      const allowed = await loadModule(slug);
      assert.equal(allowed.ok, true);
    }

    const projects = await loadProjects();
    assert.equal(projects.state, 'disabled');
    enable(COMPANY, 'projects');
    const openProjects = await loadProjects();
    assert.equal(openProjects.state, 'ready');
    if (openProjects.state === 'ready') assert.deepEqual(openProjects.data.tasks, []);

    const clients = await loadClients();
    assert.equal(clients.state, 'disabled');
    enable(COMPANY, 'clients');
    const openClients = await loadClients();
    assert.equal(openClients.state, 'ready');
    if (openClients.state === 'ready') assert.deepEqual(openClients.data.clients, []);

    const inbox = await loadInbox();
    assert.equal(inbox.state, 'disabled');
    enable(COMPANY, 'notifications');
    const openInbox = await loadInbox();
    assert.equal(openInbox.state, 'ready');
    if (openInbox.state === 'ready') assert.deepEqual(openInbox.data, []);

    resetSupabaseMock();
    resetTestCookies();
    company(COMPANY, 'north', 'North Kitchen');
    user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin', token: ADMIN_TOKEN });
    resetTestCookies();
    await assert.rejects(() => loadAnalytics({}), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'NEXT_REDIRECT:/customer-login');
      return true;
    });
    setTestCookie(CUSTOMER_SESSION_COOKIE, ADMIN_TOKEN);
    const analyticsOff = await loadAnalytics({});
    assert.equal(analyticsOff.state, 'gated');
    enable(COMPANY, 'reports');
    const analyticsOn = await loadAnalytics({});
    assert.equal(analyticsOn.state, 'ready');
  });

  it('redirects a signed-out module load and survives an empty company row', async () => {
    await assert.rejects(() => gateModule('incidents'), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'NEXT_REDIRECT:/customer-login');
      return true;
    });
    await assert.rejects(() => loadModule('staff'), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'NEXT_REDIRECT:/customer-login');
      return true;
    });
    const projects = await loadProjects();
    assert.equal(projects.state, 'signed_out');

    company(COMPANY, 'north', 'North Kitchen');
    const checklist = await onboarding(admin);
    assert.ok(checklist.steps.length >= 6);
    resetSupabaseMock();
    await assert.rejects(() => onboarding(admin), (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error instanceof TypeError, false);
      return true;
    });
  });

  it('lets only a company admin start billing checkout', async () => {
    company(COMPANY, 'north', 'North Kitchen');
    user({ id: USER, companyId: COMPANY, email: 'ada@example.com', role: 'admin' });
    const anonymous = await checkout(post('http://localhost/api/billing/checkout', { plan: 'starter' }));
    assert.equal(anonymous.status, 401);

    user({ id: FLOOR, companyId: COMPANY, email: 'lee@example.com', role: 'user', token: FLOOR_TOKEN });
    const staff = await checkout(post('http://localhost/api/billing/checkout', { plan: 'starter' }));
    assert.equal(staff.status, 403);

    user({ id: OTHER_USER, companyId: COMPANY, email: 'moe@example.com', role: 'manager', token: 'c'.repeat(43) });
    setTestCookie(CUSTOMER_SESSION_COOKIE, 'c'.repeat(43));
    const manager = await checkout(post('http://localhost/api/billing/checkout', { plan: 'growth' }));
    assert.equal(manager.status, 403);

    seed('api_tokens', [{
      company_id: COMPANY,
      user_id: USER,
      token_hash: hashToken(ADMIN_TOKEN),
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    }]);
    setTestCookie(CUSTOMER_SESSION_COOKIE, ADMIN_TOKEN);
    const adminCheckout = await checkout(post('http://localhost/api/billing/checkout', { plan: 'starter' }));
    assert.equal(adminCheckout.status, 503);
  });

  it('rate limits login, signup, and invitation accept', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await loginRoute(post('http://localhost/api/auth/customer-login', 'not-json'));
      assert.equal(response.status, 400);
    }
    const limitedLogin = await loginRoute(post('http://localhost/api/auth/customer-login', 'not-json'));
    assert.equal(limitedLogin.status, 429);

    resetGuardLimits();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await signupRoute(post('http://localhost/api/auth/signup', 'not-json'));
      assert.equal(response.status, 400);
    }
    const limitedSignup = await signupRoute(post('http://localhost/api/auth/signup', 'not-json'));
    assert.equal(limitedSignup.status, 429);

    resetGuardLimits();
    resetApiLimits();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await dispatch(post('http://localhost/api/v1/invitations/accept', { token: 'short' }), ['invitations', 'accept'], 'POST');
      assert.equal(response.status, 400);
    }
    const limitedInvite = await dispatch(post('http://localhost/api/v1/invitations/accept', { token: 'short' }), ['invitations', 'accept'], 'POST');
    assert.equal(limitedInvite.status, 429);
  });

  it('does not crash the home summary on null dates or a closed module', () => {
    const spark = taskSparkline([null, undefined, '']);
    assert.equal(spark.length, 7);
    assert.equal(spark.every((point) => point.count === 0), true);
    assert.deepEqual(taskStatusSeries([null, 'in_progress']), [
      { status: 'unknown', count: 1 },
      { status: 'in progress', count: 1 },
    ]);
    assert.equal(formatStamp(null), '');
    const closed = homeFeedPlan([], 'admin');
    assert.equal(closed.tasks, false);
    assert.equal(closed.locations, false);
    assert.equal(closed.audit, true);
    const floorPlan = homeFeedPlan(['notifications'], 'user');
    assert.equal(floorPlan.tasks, false);
    assert.equal(floorPlan.notifications, true);
    assert.equal(floorPlan.locations, false);
    const open = homeFeedPlan(['tasks', 'find_my_staff'], 'manager');
    assert.equal(open.tasks, true);
    assert.equal(open.locations, true);
  });
});
