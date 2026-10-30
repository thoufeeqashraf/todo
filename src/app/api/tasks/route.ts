import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/customer-session';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

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

    if (assignedToMe) {
      query = query.eq('assigned_to_id', session.user.id);
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
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireCustomerSession();
    const body = await request.json();
    const data = createTaskSchema.parse(body);

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

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
