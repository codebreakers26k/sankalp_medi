import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: data || [],
      count: data?.length || 0,
      success: true
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch hospitals'
    }, { status: 500 });
  }
}
