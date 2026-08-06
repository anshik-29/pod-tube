/**
 * Tests for User Update Queries (email and password)
 */

// Mock the database client BEFORE importing queries
jest.mock('@/lib/db/client');

// Import after mock is set up
import { updateUserEmail, updateUserPassword } from '@/lib/db/queries/users';
import { getDbPool } from '@/lib/db/client';

const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
};

describe('User Update Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDbPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('updateUserEmail', () => {
    it('should update user email successfully', async () => {
      const mockUser = {
        id: 'user1',
        email: 'new@example.com',
        password_hash: 'hashed',
        created_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await updateUserEmail('user1', 'new@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET email = $1 WHERE id = $2 RETURNING *',
        ['new@example.com', 'user1']
      );
      expect(result.email).toBe('new@example.com');
    });

    it('should handle email update with special characters', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test+tag@example.com',
        password_hash: 'hashed',
        created_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const result = await updateUserEmail('user1', 'test+tag@example.com');

      expect(result.email).toBe('test+tag@example.com');
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password and clear reset tokens', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        password_hash: 'new-hashed-password',
        created_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [] });

      await updateUserPassword('user1', 'new-hashed-password');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
        ['new-hashed-password', 'user1']
      );
    });
  });
});
