import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Admin-only endpoint: assign a role to a user identified by email.
// Called when an admin registers a doctor.
export async function POST(request: NextRequest) {
  try {
    const { userId: callerId } = await auth();
    if (!callerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is an admin
    const clerk = await clerkClient();
    const caller = await clerk.users.getUser(callerId);
    if ((caller.publicMetadata as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, role } = await request.json();
    if (!email || !role) {
      return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
    }
    if (!['patient', 'doctor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Find the Clerk user by email
    const users = await clerk.users.getUserList({ emailAddress: [email] });
    if (users.totalCount === 0) {
      // User hasn't signed up yet — store nothing, role will be set on their first sign-in
      // via the doctors table check if needed, or they can be updated later.
      return NextResponse.json({
        success: false,
        message: 'No Clerk account found for this email. Role will be assigned on first sign-in.',
      });
    }

    const targetUser = users.data[0];
    await clerk.users.updateUserMetadata(targetUser.id, {
      publicMetadata: { role },
    });

    return NextResponse.json({ success: true, message: `Role "${role}" assigned to ${email}` });
  } catch (error: any) {
    console.error('Error setting role:', error);
    return NextResponse.json({ error: error?.message || 'Failed to set role' }, { status: 500 });
  }
}
