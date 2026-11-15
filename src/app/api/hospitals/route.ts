import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Starting hospitals API call...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlStart: supabaseUrl?.substring(0, 20) + '...'
    });
    
    const supabase = createServerClient();
    
    console.log('Supabase client created, fetching hospitals...');
    
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name');

    console.log('Query result:', {
      dataCount: data?.length || 0,
      hasError: !!error,
      error: error
    });

    if (error) {
      console.error('Error fetching hospitals:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: data || [],
      count: data?.length || 0,
      success: true
    });
  } catch (error: any) {
    console.error('Server error:', error);
    
    // Return fallback hospitals if database fails
    const fallbackHospitals = [
      { id: 'fallback-1', name: 'City General Hospital', address: '123 Main St', city: 'New York', phone: '+1-555-0123' },
      { id: 'fallback-2', name: 'Medical Center', address: '456 Oak Ave', city: 'Los Angeles', phone: '+1-555-0124' },
      { id: 'fallback-3', name: 'Regional Hospital', address: '789 Pine Rd', city: 'Chicago', phone: '+1-555-0125' }
    ];
    
    console.log('Returning fallback hospitals due to database error:', fallbackHospitals.length);
    
    return NextResponse.json({ 
      data: fallbackHospitals,
      count: fallbackHospitals.length,
      success: true,
      fallback: true,
      error: error.message
    });
  }
}
