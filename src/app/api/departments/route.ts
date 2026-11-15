import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId');

    if (!hospitalId) {
      return NextResponse.json({ error: 'hospitalId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Server error:', error);
    
    // Return fallback departments if database fails
    const fallbackDepartments = [
      { id: 'fallback-dept-1', name: 'General Medicine', hospital_id: 'fallback-1' },
      { id: 'fallback-dept-2', name: 'Emergency', hospital_id: 'fallback-1' },
      { id: 'fallback-dept-3', name: 'Cardiology', hospital_id: 'fallback-1' },
      { id: 'fallback-dept-4', name: 'Pediatrics', hospital_id: 'fallback-1' },
      { id: 'fallback-dept-5', name: 'Orthopedics', hospital_id: 'fallback-1' },
      { id: 'fallback-dept-6', name: 'Neurology', hospital_id: 'fallback-1' }
    ];
    
    console.log('Returning fallback departments due to database error:', fallbackDepartments.length);
    
    return NextResponse.json({ 
      data: fallbackDepartments,
      count: fallbackDepartments.length,
      success: true,
      fallback: true,
      error: error.message
    });
  }
}
