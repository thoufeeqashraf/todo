import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. Set the Supabase URL, anon key, and service role, then apply migrations 001–003.' },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('industries')
      .select('*')
      .order('display_name');

    if (error) {
      console.error('Industries fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch industries' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Industries error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
