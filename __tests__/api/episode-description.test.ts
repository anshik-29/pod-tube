/**
 * Tests for Episode Description API endpoint
 */

// Mock dependencies BEFORE importing NextRequest
jest.mock('@/lib/db/queries/episodes');
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler,
}));
jest.mock('@/lib/auth/route-helpers', () => ({
  getParams: async (context: any) => {
    if (context?.params instanceof Promise) {
      return await context.params;
    }
    return context?.params || { id: 'episode1' };
  },
}));

// Import after mocks are set up
import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/episodes/[id]/description/route';
import { getEpisodeById, updateEpisodeDescription } from '@/lib/db/queries/episodes';

const mockGetEpisodeById = getEpisodeById as jest.MockedFunction<typeof getEpisodeById>;
const mockUpdateEpisodeDescription = updateEpisodeDescription as jest.MockedFunction<typeof updateEpisodeDescription>;

describe('Episode Description API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update episode description successfully', async () => {
    const mockEpisode = {
      id: 'episode1',
      host_id: 'user1',
      title: 'Test Episode',
      description: null,
      state: 'ready',
      session_id: 'session1',
      file_references: {},
      trim_settings: null,
      created_at: new Date(),
    };

    const updatedEpisode = {
      ...mockEpisode,
      description: 'This is a test description',
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);
    mockUpdateEpisodeDescription.mockResolvedValue(updatedEpisode as any);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1/description', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ description: 'This is a test description' }),
    });
    (req as any).userId = 'user1';

    const response = await PUT(req, { params: { id: 'episode1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.episode.description).toBe('This is a test description');
    expect(mockUpdateEpisodeDescription).toHaveBeenCalledWith('episode1', 'This is a test description');
  });

  it('should clear description when null is provided', async () => {
    const mockEpisode = {
      id: 'episode1',
      host_id: 'user1',
      title: 'Test Episode',
      description: 'Old description',
      state: 'ready',
      session_id: 'session1',
      file_references: {},
      trim_settings: null,
      created_at: new Date(),
    };

    const updatedEpisode = {
      ...mockEpisode,
      description: null,
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);
    mockUpdateEpisodeDescription.mockResolvedValue(updatedEpisode as any);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1/description', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ description: null }),
    });
    (req as any).userId = 'user1';

    const response = await PUT(req, { params: { id: 'episode1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.episode.description).toBeNull();
    expect(mockUpdateEpisodeDescription).toHaveBeenCalledWith('episode1', '');
  });

  it('should reject unauthorized access', async () => {
    const mockEpisode = {
      id: 'episode1',
      host_id: 'user2', // Different user
      title: 'Test Episode',
      description: null,
      state: 'ready',
      session_id: 'session1',
      file_references: {},
      trim_settings: null,
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1/description', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ description: 'Test description' }),
    });
    (req as any).userId = 'user1'; // Different user

    const response = await PUT(req, { params: { id: 'episode1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
    expect(mockUpdateEpisodeDescription).not.toHaveBeenCalled();
  });

  it('should reject invalid description type', async () => {
    const mockEpisode = {
      id: 'episode1',
      host_id: 'user1',
      title: 'Test Episode',
      description: null,
      state: 'ready',
      session_id: 'session1',
      file_references: {},
      trim_settings: null,
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1/description', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ description: 123 }), // Invalid type
    });
    (req as any).userId = 'user1';

    const response = await PUT(req, { params: { id: 'episode1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid description');
    expect(mockUpdateEpisodeDescription).not.toHaveBeenCalled();
  });

  it('should handle episode not found', async () => {
    mockGetEpisodeById.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1/description', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ description: 'Test description' }),
    });
    (req as any).userId = 'user1';

    const response = await PUT(req, { params: { id: 'episode1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Episode not found');
    expect(mockUpdateEpisodeDescription).not.toHaveBeenCalled();
  });
});
