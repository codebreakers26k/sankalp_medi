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

    // Set Clerk publicMetadata role to "patient" only if no role is already set
    // (preserves doctor/admin roles assigned elsewhere)
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const existingRole = (clerkUser.publicMetadata as any)?.role;
    if (!existingRole) {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { role: 'patient' },
      });
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
