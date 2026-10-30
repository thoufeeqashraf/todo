import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/customer-session';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { canAssignToOthers, canSeeCompanyTasks } from '@/lib/platform-rules';
import { jsonFromError } from '@/lib/json-error';
import {
  isIsoDateTime,
  normalizeTaskStatus,
  readJson,
  taskVisibilityFilter,
} from '@/lib/request-guards';
import { assertModule, assertSameCompanyDepartment, assertSameCompanyUser, writeAudit } from '@/lib/services/tenant';

const optionalTimestamp = z.union([z.literal(''), z.string().max(40).refine(isIsoDateTime)]).optional();

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(4000).optional(),
  assigned_to_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  due_date: optionalTimestamp,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireCustomerSession();
    const actor = {
      userId: session.user.id,
      companyId: session.companyId,
      role: session.user.role,
      email: session.user.email,
    };
    await assertModule(actor, 'tasks');
    const { searchParams } = new URL(request.url);
    const status = normalizeTaskStatus(searchParams.get('status'));
    if (status === null) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    const assignedToMe = searchParams.get('assigned_to_me') === 'true';

    let query = supabaseAdmin
      .from('tasks')
      .select(`
        *,
        assigned_to:users!tasks_assigned_to_id_fkey(id, first_name, last_name, email),
        assigned_by:users!tasks_assigned_by_id_fkey(id, first_name, last_name, email)
      `)
      .eq('company_id', session.companyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (assignedToMe || !canSeeCompanyTasks(actor.role)) {
      query = query.or(taskVisibilityFilter(actor.userId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Tasks fetch error');
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return jsonFromError(error, 'Get tasks error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireCustomerSession();
    const actor = {
      userId: session.user.id,
      companyId: session.companyId,
      role: session.user.role,
      email: session.user.email,
    };
    await assertModule(actor, 'tasks');
    const body = await readJson(request);
    const data = createTaskSchema.parse(body);
    if (data.assigned_to_id && data.assigned_to_id !== actor.userId && !canAssignToOthers(actor.role)) {
      return NextResponse.json({ error: 'Floor staff can only keep tasks on their own list.' }, { status: 403 });
    }
    if (data.assigned_to_id) await assertSameCompanyUser(actor.companyId, data.assigned_to_id);
    if (data.department_id) await assertSameCompanyDepartment(actor.companyId, data.department_id);

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        title: data.title,
        description: data.description ?? null,
        assigned_to_id: data.assigned_to_id ?? null,
        department_id: data.department_id ?? null,
        due_date: data.due_date || null,
        priority: data.priority,
        company_id: session.companyId,
        assigned_by_id: session.user.id,
        status: 'todo',
      })
      .select()
      .single();

    if (error) {
      console.error('Task creation error');
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    await writeAudit(actor, 'task.created', 'task', task.id, { title: data.title });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return jsonFromError(error, 'Create task error');
  }
}
