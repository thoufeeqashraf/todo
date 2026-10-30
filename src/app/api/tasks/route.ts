import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/customer-session';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { PlatformError } from '@/lib/platform-error';
import { canAssignToOthers, canSeeCompanyTasks } from '@/lib/platform-rules';
import { assertModule, writeAudit } from '@/lib/services/tenant';

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assigned_to_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
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
    const status = searchParams.get('status');
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
      query = query.or(`assigned_to_id.eq.${actor.userId},assigned_by_id.eq.${actor.userId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Tasks fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get tasks error:', error);
    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
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
    const body = await request.json();
    const data = createTaskSchema.parse(body);
    if (data.assigned_to_id && data.assigned_to_id !== actor.userId && !canAssignToOthers(actor.role)) {
      return NextResponse.json({ error: 'Floor staff can only keep tasks on their own list.' }, { status: 403 });
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        ...data,
        company_id: session.companyId,
        assigned_by_id: session.user.id,
        status: 'todo',
      })
      .select()
      .single();

    if (error) {
      console.error('Task creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    await writeAudit(actor, 'task.created', 'task', task.id, { title: data.title });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof PlatformError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
