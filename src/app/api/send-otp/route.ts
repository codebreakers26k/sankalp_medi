import { NextRequest, NextResponse } from 'next/server';
import { otpService } from '@/lib/services/otpService';
import { emailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 OTP Request received');
    const { email, purpose } = await request.json();
    console.log('📧 Email:', email, '| Purpose:', purpose);

    if (!email) {
      console.log('❌ Email is required');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('✅ Email validation passed');

    // Invalidate any previous OTPs for this email and purpose
    console.log('🗑️ Invalidating previous OTPs...');
    await otpService.invalidateOTPs(email, purpose || 'appointment');

    // Generate and store new OTP
    console.log('🎲 Generating new OTP...');
    const { otp, id } = await otpService.createOTP(email, purpose || 'appointment');
    console.log('✅ OTP generated:', otp, '| ID:', id);

    // Send OTP via email (with non-blocking fallback)
    console.log('📨 Sending OTP email...');
    let emailSent = false;
    try {
      emailSent = await emailService.sendOTPEmail(email, otp, purpose || 'appointment');
    } catch (err: any) {
      console.warn('⚠️ SMTP send error (falling back to devOtp):', err?.message);
    }

    console.log('✅ OTP processed:', otp, '| Email dispatched:', emailSent);
    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'OTP sent to your email. Please check your inbox or spam folder.'
        : 'OTP code generated. You can use the quick access code below or check email.',
      otpId: id,
      devOtp: otp,
      emailSent,
    });

  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: `Failed to process OTP: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
