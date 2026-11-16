import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, name, email, mobile } = await request.json();

    if (!userId || !name || !email) {
      return NextResponse.json(
        { error: 'User ID, name, and email are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const patientId = `PAT${Date.now().toString().slice(-6)}`;

    // Use server-side client to upsert user
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        name,
        email,
        patient_id: patientId,
        mobile: mobile || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (userError) {
      console.error('Server-side user upsert error:', userError);
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // Set Clerk publicMetadata role if not already set.
    // If the email is registered in doctors table, assign "doctor", else "patient".
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    let role = (clerkUser.publicMetadata as any)?.role;

    if (!role) {
      const { data: doctorRecord } = await supabase
        .from('doctors')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      role = doctorRecord ? 'doctor' : 'patient';

      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { role },
      });
    }

    // Bidirectional sync: If Clerk user has role "doctor", ensure they exist in Supabase `doctors` table
    if (role === 'doctor') {
      const { data: existingDoctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!existingDoctor) {
        // Find default hospital and department
        const { data: hosp } = await supabase.from('hospitals').select('id').limit(1).maybeSingle();
        let deptId = null;
        if (hosp) {
          const { data: dept } = await supabase
            .from('departments')
            .select('id')
            .eq('hospital_id', hosp.id)
            .limit(1)
            .maybeSingle();
          deptId = dept?.id || null;
        }

        const formattedName = name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`;

        await supabase.from('doctors').insert({
          name: formattedName,
          email,
          phone: mobile || null,
          hospital_id: hosp?.id || null,
          department_id: deptId,
          specialization: 'General Medicine',
          qualification: 'MBBS, MD',
          experience: 5,
          rating: 4.9,
          average_treatment_time: 15,
          is_on_leave: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User ensured successfully'
    });

  } catch (error: any) {
    console.error('Error ensuring user:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to ensure user' },
      { status: 500 }
    );
  }
}
