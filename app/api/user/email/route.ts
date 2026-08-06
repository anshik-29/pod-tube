import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUserById, updateUserEmail, getUserByEmail } from '@/lib/db/queries/users';
import { z } from 'zod';

const updateEmailSchema = z.object({
  email: z.string().email(),
});

export const PUT = withAuth(async (req) => {
  try {
    const userId = req.userId!;
    const body = await req.json();
    const { email } = updateEmailSchema.parse(body);

    // Check if email is already taken by another user
    const existingUser = await getUserByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 400 }
      );
    }

    // Get current user to check if email is unchanged
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (currentUser.email === email) {
      return NextResponse.json(
        { error: 'Email is unchanged' },
        { status: 400 }
      );
    }

    // Update email
    await updateUserEmail(userId, email);

    return NextResponse.json({ success: true, message: 'Email updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    console.error('Update email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
