/**
 * Tests for Bulk Delete Episodes functionality
 */

import { DELETE } from '@/app/api/episodes/[id]/route';
import { getEpisodeById, deleteEpisode } from '@/lib/db/queries/episodes';
import { deleteSession } from '@/lib/db/queries/sessions';

// Mock dependencies BEFORE importing NextRequest
jest.mock('@/lib/db/queries/episodes');
jest.mock('@/lib/db/queries/sessions');
jest.mock('@/lib/cleanup/storage', () => ({
  deleteEpisodeWithStorageCleanup: jest.fn().mockImplementation(async (id: string) => {
    const { deleteEpisode } = require('@/lib/db/queries/episodes');
    return deleteEpisode(id);
  }),
}));
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler,
}));

// Import after mocks are set up
import { NextRequest } from 'next/server';

const mockGetEpisodeById = getEpisodeById as jest.MockedFunction<typeof getEpisodeById>;
const mockDeleteEpisode = deleteEpisode as jest.MockedFunction<typeof deleteEpisode>;
const mockDeleteSession = deleteSession as jest.MockedFunction<typeof deleteSession>;

describe('Bulk Delete Episodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a single episode successfully', async () => {
    const mockEpisode = {
      id: 'episode1',
      session_id: 'session1',
      host_id: 'user1',
      title: 'Test Episode',
      state: 'ready',
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);
    mockDeleteEpisode.mockResolvedValue(undefined);
    mockDeleteSession.mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1', {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer test-token',
      },
    });
    (req as any).userId = 'user1';

    const response = await DELETE(req, { params: Promise.resolve({ id: 'episode1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteEpisode).toHaveBeenCalledWith('episode1');
    expect(mockDeleteSession).toHaveBeenCalledWith('session1');
  });

  it('should reject deletion of episode owned by another user', async () => {
    const mockEpisode = {
      id: 'episode1',
      session_id: 'session1',
      host_id: 'user2', // Different user
      title: 'Test Episode',
      state: 'ready',
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1', {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer test-token',
      },
    });
    (req as any).userId = 'user1';

    const response = await DELETE(req, { params: Promise.resolve({ id: 'episode1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
    expect(mockDeleteEpisode).not.toHaveBeenCalled();
  });

  it('should handle multiple episode deletions (bulk delete scenario)', async () => {
    const episodes = [
      { id: 'episode1', session_id: 'session1', host_id: 'user1' },
      { id: 'episode2', session_id: 'session2', host_id: 'user1' },
      { id: 'episode3', session_id: 'session3', host_id: 'user1' },
    ];

    // Mock each episode lookup
    mockGetEpisodeById
      .mockResolvedValueOnce({ ...episodes[0], title: 'Episode 1', state: 'ready', created_at: new Date() } as any)
      .mockResolvedValueOnce({ ...episodes[1], title: 'Episode 2', state: 'ready', created_at: new Date() } as any)
      .mockResolvedValueOnce({ ...episodes[2], title: 'Episode 3', state: 'ready', created_at: new Date() } as any);

    mockDeleteEpisode.mockResolvedValue(undefined);
    mockDeleteSession.mockResolvedValue(undefined);

    // Delete each episode
    const deletePromises = episodes.map(async (episode) => {
      const req = new NextRequest(`http://localhost:3000/api/episodes/${episode.id}`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer test-token',
        },
      });
      (req as any).userId = 'user1';

      return DELETE(req, { params: Promise.resolve({ id: episode.id }) });
    });

    const responses = await Promise.all(deletePromises);

    // All should succeed
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    // All episodes should be deleted
    expect(mockDeleteEpisode).toHaveBeenCalledTimes(3);
    expect(mockDeleteEpisode).toHaveBeenCalledWith('episode1');
    expect(mockDeleteEpisode).toHaveBeenCalledWith('episode2');
    expect(mockDeleteEpisode).toHaveBeenCalledWith('episode3');

    // All sessions should be deleted
    expect(mockDeleteSession).toHaveBeenCalledTimes(3);
  });

  it('should handle partial failures in bulk delete', async () => {
    const episodes = [
      { id: 'episode1', session_id: 'session1', host_id: 'user1' },
      { id: 'episode2', session_id: 'session2', host_id: 'user1' },
    ];

    mockGetEpisodeById
      .mockResolvedValueOnce({ ...episodes[0], title: 'Episode 1', state: 'ready', created_at: new Date() } as any)
      .mockResolvedValueOnce({ ...episodes[1], title: 'Episode 2', state: 'ready', created_at: new Date() } as any);

    // First delete succeeds, second fails
    mockDeleteEpisode
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Delete failed'));

    mockDeleteSession.mockResolvedValue(undefined);

    const deletePromises = episodes.map(async (episode) => {
      const req = new NextRequest(`http://localhost:3000/api/episodes/${episode.id}`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer test-token',
        },
      });
      (req as any).userId = 'user1';

      return DELETE(req, { params: Promise.resolve({ id: episode.id }) });
    });

    const results = await Promise.allSettled(deletePromises);

    // First should succeed
    expect(results[0].status).toBe('fulfilled');
    if (results[0].status === 'fulfilled') {
      expect((await results[0].value.json()).success).toBe(true);
    }

    // Second should fail
    expect(results[1].status).toBe('fulfilled'); // The route handler catches errors
    if (results[1].status === 'fulfilled') {
      const response = results[1].value;
      expect(response.status).toBe(500);
    }
  });
});
