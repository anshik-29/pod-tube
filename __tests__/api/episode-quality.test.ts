/**
 * Tests for Episode Quality Options
 */

import { POST } from '@/app/api/episodes/[id]/route';
import { getEpisodeById, updateEpisodeTrimSettings } from '@/lib/db/queries/episodes';
import { queueProcessing } from '@/lib/processing/processor';
import { getProcessingJobByEpisodeId } from '@/lib/db/queries/processing-jobs';

// Mock dependencies BEFORE importing NextRequest
jest.mock('@/lib/db/queries/episodes');
jest.mock('@/lib/processing/processor');
jest.mock('@/lib/db/queries/processing-jobs');
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => handler,
}));

// Import after mocks are set up
import { NextRequest } from 'next/server';

const mockGetEpisodeById = getEpisodeById as jest.MockedFunction<typeof getEpisodeById>;
const mockUpdateEpisodeTrimSettings = updateEpisodeTrimSettings as jest.MockedFunction<typeof updateEpisodeTrimSettings>;
const mockQueueProcessing = queueProcessing as jest.MockedFunction<typeof queueProcessing>;
const mockGetProcessingJobByEpisodeId = getProcessingJobByEpisodeId as jest.MockedFunction<typeof getProcessingJobByEpisodeId>;

describe('Episode Quality Options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save quality setting along with trim settings', async () => {
    const mockEpisode = {
      id: 'episode1',
      session_id: 'session1',
      host_id: 'user1',
      title: 'Test Episode',
      state: 'processing',
      created_at: new Date(),
    };

    const updatedEpisode = {
      ...mockEpisode,
      trim_settings: { trimStart: 0, trimEnd: 0, quality: 'high' },
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);
    mockUpdateEpisodeTrimSettings.mockResolvedValue(updatedEpisode as any);
    mockGetProcessingJobByEpisodeId.mockResolvedValue(null);
    mockQueueProcessing.mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        trimStart: 0,
        trimEnd: 0,
        quality: 'high',
      }),
    });
    (req as any).userId = 'user1';

    const response = await POST(req, { params: Promise.resolve({ id: 'episode1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdateEpisodeTrimSettings).toHaveBeenCalledWith('episode1', 0, 0, 'high');
  });

  it('should accept low quality setting', async () => {
    const mockEpisode = {
      id: 'episode1',
      session_id: 'session1',
      host_id: 'user1',
      title: 'Test Episode',
      state: 'processing',
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);
    mockUpdateEpisodeTrimSettings.mockResolvedValue(mockEpisode as any);
    mockGetProcessingJobByEpisodeId.mockResolvedValue(null);
    mockQueueProcessing.mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        quality: 'low',
      }),
    });
    (req as any).userId = 'user1';

    const response = await POST(req, { params: Promise.resolve({ id: 'episode1' }) });

    expect(response.status).toBe(200);
    expect(mockUpdateEpisodeTrimSettings).toHaveBeenCalledWith('episode1', undefined, undefined, 'low');
  });

  it('should accept medium quality setting', async () => {
    const mockEpisode = {
      id: 'episode1',
      session_id: 'session1',
      host_id: 'user1',
      title: 'Test Episode',
      state: 'processing',
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);
    mockUpdateEpisodeTrimSettings.mockResolvedValue(mockEpisode as any);
    mockGetProcessingJobByEpisodeId.mockResolvedValue(null);
    mockQueueProcessing.mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        quality: 'medium',
      }),
    });
    (req as any).userId = 'user1';

    const response = await POST(req, { params: Promise.resolve({ id: 'episode1' }) });

    expect(response.status).toBe(200);
    expect(mockUpdateEpisodeTrimSettings).toHaveBeenCalledWith('episode1', undefined, undefined, 'medium');
  });

  it('should reject invalid quality value', async () => {
    const mockEpisode = {
      id: 'episode1',
      session_id: 'session1',
      host_id: 'user1',
      title: 'Test Episode',
      state: 'processing',
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        quality: 'invalid',
      }),
    });
    (req as any).userId = 'user1';

    const response = await POST(req, { params: Promise.resolve({ id: 'episode1' }) });

    expect(response.status).toBe(400);
  });

  it('should work without quality setting (defaults to medium)', async () => {
    const mockEpisode = {
      id: 'episode1',
      session_id: 'session1',
      host_id: 'user1',
      title: 'Test Episode',
      state: 'processing',
      created_at: new Date(),
    };

    mockGetEpisodeById.mockResolvedValue(mockEpisode as any);
    mockUpdateEpisodeTrimSettings.mockResolvedValue(mockEpisode as any);
    mockGetProcessingJobByEpisodeId.mockResolvedValue(null);
    mockQueueProcessing.mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/episodes/episode1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        trimStart: 10,
        trimEnd: 100,
      }),
    });
    (req as any).userId = 'user1';

    const response = await POST(req, { params: Promise.resolve({ id: 'episode1' }) });

    expect(response.status).toBe(200);
    expect(mockUpdateEpisodeTrimSettings).toHaveBeenCalledWith('episode1', 10, 100, undefined);
  });
});
