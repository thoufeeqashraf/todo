import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerSession } from '@/lib/customer-session';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { jsonFromError } from '@/lib/json-error';
import { readJson } from '@/lib/request-guards';
import { writeAudit } from '@/lib/services/tenant';

export async function GET() {
  try {
    const session = await requireCustomerSession();

    // Get all modules with their enabled status for this company
    const { data: modules, error: modulesError } = await supabaseAdmin
      .from('modules')
      .select('*')
      .order('category', { ascending: true })
      .order('display_name', { ascending: true });

    if (modulesError) {
      console.error('Modules fetch error:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch modules' },
        { status: 500 }
      );
    }

    // Get company's enabled modules
    const { data: companyModules, error: companyModulesError } = await supabaseAdmin
      .from('company_modules')
      .select('module_id, is_enabled')
      .eq('company_id', session.companyId);

    if (companyModulesError) {
      console.error('Company modules fetch error:', companyModulesError);
      return NextResponse.json(
        { error: 'Failed to fetch company modules' },
        { status: 500 }
      );
    }

    // Merge module data with enabled status
    const enabledMap = new Map(
      companyModules?.map((cm) => [cm.module_id, cm.is_enabled]) || []
    );

    const modulesWithStatus = modules?.map((module) => ({
      ...module,
      is_enabled: enabledMap.get(module.id) || false,
    }));

    return NextResponse.json(modulesWithStatus);
  } catch (error) {
    return jsonFromError(error, 'Get modules error');
  }
}

const updateModuleSchema = z.object({
  moduleId: z.string().uuid(),
  isEnabled: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await requireCustomerSession();

    // Only admins can toggle modules
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can manage modules' },
        { status: 403 }
      );
    }

    const body = await readJson(request);
    const data = updateModuleSchema.parse(body);

    // Check if module exists
    const { data: module, error: moduleError } = await supabaseAdmin
      .from('modules')
      .select('*')
      .eq('id', data.moduleId)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // Upsert company_module
    const { error: upsertError } = await supabaseAdmin
      .from('company_modules')
      .upsert({
        company_id: session.companyId,
        module_id: data.moduleId,
        is_enabled: data.isEnabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id,module_id',
      });

    if (upsertError) {
      console.error('Module toggle error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update module' },
        { status: 500 }
      );
    }

    await writeAudit(
      { userId: session.user.id, companyId: session.companyId },
      'module.toggled',
      'module',
      data.moduleId,
      { isEnabled: data.isEnabled },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonFromError(error, 'Update module error');
  }
}
