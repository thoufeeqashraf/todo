import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString()
      );
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session || session.type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all modules with their status for this company
    const { data: modules, error: modulesError } = await supabaseAdmin
      .from('modules')
      .select(`
        *,
        company_modules!left(is_enabled, company_id)
      `)
      .order('category')
      .order('display_name');

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }

    // Transform the data to include enabled status
    const modulesWithStatus = modules?.map((module: {
      id: string;
      name: string;
      display_name: string;
      description: string | null;
      category: string | null;
      company_modules?: Array<{ is_enabled: boolean; company_id: string }>;
    }) => {
      const companyModule = module.company_modules?.find(
        (cm) => cm.company_id === session.companyId
      );
      return {
        id: module.id,
        name: module.name,
        display_name: module.display_name,
        description: module.description,
        category: module.category,
        is_enabled: companyModule?.is_enabled ?? false,
      };
    });

    return NextResponse.json({ modules: modulesWithStatus });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let session;
    try {
      session = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString()
      );
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session || session.type !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { moduleId, isEnabled } = body;

    if (!moduleId || typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Check if the company_module record exists
    const { data: existing } = await supabaseAdmin
      .from('company_modules')
      .select('id')
      .eq('company_id', session.companyId)
      .eq('module_id', moduleId)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabaseAdmin
        .from('company_modules')
        .update({ is_enabled: isEnabled })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating module:', error);
        return NextResponse.json(
          { error: 'Failed to update module' },
          { status: 500 }
        );
      }
    } else {
      // Create new record
      const { error } = await supabaseAdmin
        .from('company_modules')
        .insert({
          company_id: session.companyId,
          module_id: moduleId,
          is_enabled: isEnabled,
        });

      if (error) {
        console.error('Error creating module:', error);
        return NextResponse.json(
          { error: 'Failed to create module' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
