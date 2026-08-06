/**
 * Tests for Processing Progress Tracking
 */

// Mock dependencies BEFORE importing
jest.mock('@/lib/db/client');

// Import after mocks are set up
import { updateProcessingJobStatus } from '@/lib/db/queries/processing-jobs';
import { getDbPool } from '@/lib/db/client';

const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
};

describe('Processing Progress Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDbPool as jest.Mock).mockReturnValue(mockPool);
  });

  it('should update progress without changing status', async () => {
    const mockJob = {
      id: 'job1',
      episode_id: 'episode1',
      status: 'processing',
      progress: 50,
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockQuery.mockResolvedValue({ rows: [mockJob] });

    const result = await updateProcessingJobStatus('job1', 'processing', null, 50);

    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE processing_jobs SET status = $1, error_message = $2, progress = COALESCE($3, progress), updated_at = NOW() WHERE id = $4 RETURNING *',
      ['processing', null, 50, 'job1']
    );
    expect(result.progress).toBe(50);
  });

  it('should preserve existing progress when progress is undefined', async () => {
    const mockJob = {
      id: 'job1',
      episode_id: 'episode1',
      status: 'processing',
      progress: 30,
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockQuery.mockResolvedValue({ rows: [mockJob] });

    await updateProcessingJobStatus('job1', 'processing', null);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('progress = COALESCE($3, progress)'),
      expect.arrayContaining(['processing', null, null, 'job1'])
    );
  });

  it('should update progress to 100 on completion', async () => {
    const mockJob = {
      id: 'job1',
      episode_id: 'episode1',
      status: 'completed',
      progress: 100,
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockQuery.mockResolvedValue({ rows: [mockJob] });

    const result = await updateProcessingJobStatus('job1', 'completed', null, 100);

    expect(result.progress).toBe(100);
    expect(result.status).toBe('completed');
  });

  it('should handle progress updates during processing', async () => {
    const progressUpdates = [10, 25, 50, 75, 95, 100];
    
    for (const progress of progressUpdates) {
      const mockJob = {
        id: 'job1',
        episode_id: 'episode1',
        status: 'processing',
        progress,
        error_message: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockJob] });

      const result = await updateProcessingJobStatus('job1', 'processing', null, progress);
      expect(result.progress).toBe(progress);
    }

    expect(mockQuery).toHaveBeenCalledTimes(progressUpdates.length);
  });
});
