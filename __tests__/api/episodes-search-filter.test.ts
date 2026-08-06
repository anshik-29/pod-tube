/**
 * Tests for Episode Search & Filter functionality
 */

import { GET } from '@/app/api/episodes/route';
import { getEpisodesByHostId } from '@/lib/db/queries/episodes';

// Mock the database queries BEFORE importing NextRequest
jest.mock('@/lib/db/queries/episodes');
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler,
}));

// Import NextRequest after mocks are set up
import { NextRequest } from 'next/server';

const mockGetEpisodesByHostId = getEpisodesByHostId as jest.MockedFunction<typeof getEpisodesByHostId>;

describe('Episode Search & Filter API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all episodes when no filters are provided', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Episode 1', state: 'ready', host_id: 'user1' },
      { id: '2', title: 'Episode 2', state: 'processing', host_id: 'user1' },
    ];

    mockGetEpisodesByHostId.mockResolvedValue(mockEpisodes as any);

    const req = new NextRequest('http://localhost:3000/api/episodes', {
      headers: { authorization: 'Bearer test-token' },
    });
    (req as any).userId = 'user1';

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.episodes).toHaveLength(2);
    expect(mockGetEpisodesByHostId).toHaveBeenCalledWith('user1', {
      search: undefined,
      state: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('should filter episodes by search query', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Test Episode', state: 'ready', host_id: 'user1' },
    ];

    mockGetEpisodesByHostId.mockResolvedValue(mockEpisodes as any);

    const req = new NextRequest('http://localhost:3000/api/episodes?search=Test', {
      headers: { authorization: 'Bearer test-token' },
    });
    (req as any).userId = 'user1';

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetEpisodesByHostId).toHaveBeenCalledWith('user1', {
      search: 'Test',
      state: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('should filter episodes by state', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Episode 1', state: 'ready', host_id: 'user1' },
    ];

    mockGetEpisodesByHostId.mockResolvedValue(mockEpisodes as any);

    const req = new NextRequest('http://localhost:3000/api/episodes?state=ready', {
      headers: { authorization: 'Bearer test-token' },
    });
    (req as any).userId = 'user1';

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetEpisodesByHostId).toHaveBeenCalledWith('user1', {
      search: undefined,
      state: 'ready',
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('should combine search and state filters', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Test Episode', state: 'ready', host_id: 'user1' },
    ];

    mockGetEpisodesByHostId.mockResolvedValue(mockEpisodes as any);

    const req = new NextRequest('http://localhost:3000/api/episodes?search=Test&state=ready', {
      headers: { authorization: 'Bearer test-token' },
    });
    (req as any).userId = 'user1';

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetEpisodesByHostId).toHaveBeenCalledWith('user1', {
      search: 'Test',
      state: 'ready',
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('should handle date filters', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Episode 1', state: 'ready', host_id: 'user1' },
    ];

    mockGetEpisodesByHostId.mockResolvedValue(mockEpisodes as any);

    const dateFrom = '2025-01-01';
    const dateTo = '2025-01-31';
    const req = new NextRequest(`http://localhost:3000/api/episodes?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
      headers: { authorization: 'Bearer test-token' },
    });
    (req as any).userId = 'user1';

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetEpisodesByHostId).toHaveBeenCalledWith('user1', {
      search: undefined,
      state: undefined,
      dateFrom: expect.any(Date),
      dateTo: expect.any(Date),
    });
  });

  it('should handle errors gracefully', async () => {
    mockGetEpisodesByHostId.mockRejectedValue(new Error('Database error'));

    const req = new NextRequest('http://localhost:3000/api/episodes', {
      headers: { authorization: 'Bearer test-token' },
    });
    (req as any).userId = 'user1';

    const response = await GET(req);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});
