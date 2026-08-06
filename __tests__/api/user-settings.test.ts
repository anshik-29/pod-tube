/**
 * Tests for User Settings API endpoints (email and password update)
 */

// Mock dependencies BEFORE importing NextRequest
jest.mock('@/lib/db/queries/users');
jest.mock('@/lib/auth/password');
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler,
}));

// Import after mocks are set up
import { NextRequest } from 'next/server';
import { PUT as UpdateEmail } from '@/app/api/user/email/route';
import { PUT as UpdatePassword } from '@/app/api/user/password/route';
import { getUserById, getUserByEmail, updateUserEmail, updateUserPassword } from '@/lib/db/queries/users';
import { verifyPassword, hashPassword } from '@/lib/auth/password';

const mockGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockGetUserByEmail = getUserByEmail as jest.MockedFunction<typeof getUserByEmail>;
const mockUpdateUserEmail = updateUserEmail as jest.MockedFunction<typeof updateUserEmail>;
const mockUpdateUserPassword = updateUserPassword as jest.MockedFunction<typeof updateUserPassword>;
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('User Settings API - Email Update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update user email successfully', async () => {
    const mockUser = {
      id: 'user1',
      email: 'old@example.com',
      password_hash: 'hashed',
      created_at: new Date(),
    };

    const updatedUser = {
      ...mockUser,
      email: 'new@example.com',
    };

    mockGetUserById.mockResolvedValue(mockUser as any);
    mockGetUserByEmail.mockResolvedValue(null); // Email not taken
    mockUpdateUserEmail.mockResolvedValue(updatedUser as any);

    const req = new NextRequest('http://localhost:3000/api/user/email', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ email: 'new@example.com' }),
    });
    (req as any).userId = 'user1';

    const response = await UpdateEmail(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdateUserEmail).toHaveBeenCalledWith('user1', 'new@example.com');
  });

  it('should reject duplicate email', async () => {
    const mockUser = {
      id: 'user1',
      email: 'old@example.com',
      password_hash: 'hashed',
      created_at: new Date(),
    };

    const otherUser = {
      id: 'user2',
      email: 'new@example.com',
      password_hash: 'hashed',
      created_at: new Date(),
    };

    mockGetUserById.mockResolvedValue(mockUser as any);
    mockGetUserByEmail.mockResolvedValue(otherUser as any);

    const req = new NextRequest('http://localhost:3000/api/user/email', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ email: 'new@example.com' }),
    });
    (req as any).userId = 'user1';

    const response = await UpdateEmail(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email is already in use');
    expect(mockUpdateUserEmail).not.toHaveBeenCalled();
  });

  it('should reject unchanged email', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      password_hash: 'hashed',
      created_at: new Date(),
    };

    mockGetUserById.mockResolvedValue(mockUser as any);
    mockGetUserByEmail.mockResolvedValue(mockUser as any); // Same user, so email check passes

    const req = new NextRequest('http://localhost:3000/api/user/email', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    (req as any).userId = 'user1';

    const response = await UpdateEmail(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email is unchanged');
    expect(mockUpdateUserEmail).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/email', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ email: 'invalid-email' }),
    });
    (req as any).userId = 'user1';

    const response = await UpdateEmail(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid email format');
  });
});

describe('User Settings API - Password Update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update password successfully', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      password_hash: 'old-hashed-password',
      created_at: new Date(),
    };

    mockGetUserById.mockResolvedValue(mockUser as any);
    mockVerifyPassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue('new-hashed-password');
    mockUpdateUserPassword.mockResolvedValue();

    const req = new NextRequest('http://localhost:3000/api/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
      }),
    });
    (req as any).userId = 'user1';

    const response = await UpdatePassword(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockVerifyPassword).toHaveBeenCalledWith('old-password', 'old-hashed-password');
    expect(mockHashPassword).toHaveBeenCalledWith('new-password-123');
    expect(mockUpdateUserPassword).toHaveBeenCalledWith('user1', 'new-hashed-password');
  });

  it('should reject incorrect current password', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      password_hash: 'old-hashed-password',
      created_at: new Date(),
    };

    mockGetUserById.mockResolvedValue(mockUser as any);
    mockVerifyPassword.mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        currentPassword: 'wrong-password',
        newPassword: 'new-password-123',
      }),
    });
    (req as any).userId = 'user1';

    const response = await UpdatePassword(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Current password is incorrect');
    expect(mockUpdateUserPassword).not.toHaveBeenCalled();
  });

  it('should validate password length', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'short',
      }),
    });
    (req as any).userId = 'user1';

    const response = await UpdatePassword(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('at least 8 characters');
  });

  it('should require all password fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/user/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        currentPassword: 'old-password',
        // Missing newPassword
      }),
    });
    (req as any).userId = 'user1';

    const response = await UpdatePassword(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('at least 8 characters');
  });
});
