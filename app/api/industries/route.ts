import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: industries, error } = await supabaseAdmin
      .from('industries')
      .select('*')
      .order('display_name');

    if (error) {
      console.error('Error fetching industries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch industries' },
        { status: 500 }
      );
    }

    return NextResponse.json({ industries });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
