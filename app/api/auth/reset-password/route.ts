import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByResetToken, updateUserPassword } from '@/lib/db/queries/users';
import { hashPassword } from '@/lib/auth/password';

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await resetPasswordSchema.parse(await req.json());
    const { token, password } = body;

    // Find user by reset token
    const user = await getUserByResetToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Update password
    const passwordHash = await hashPassword(password);
    await updateUserPassword(user.id, passwordHash);

    return NextResponse.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
