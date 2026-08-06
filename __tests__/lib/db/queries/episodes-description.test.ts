/**
 * Tests for Episode Description Query Functions
 */

// Mock the database client BEFORE importing queries
jest.mock('@/lib/db/client');

// Import after mock is set up
import { updateEpisodeDescription } from '@/lib/db/queries/episodes';
import { getDbPool } from '@/lib/db/client';

const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
};

describe('Episode Description Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDbPool as jest.Mock).mockReturnValue(mockPool);
  });

  it('should update episode description', async () => {
    const mockEpisode = {
      id: 'episode1',
      host_id: 'user1',
      title: 'Test Episode',
      description: 'New description',
      state: 'ready',
      session_id: 'session1',
      file_references: {},
      trim_settings: null,
      created_at: new Date(),
    };

    mockQuery.mockResolvedValue({ rows: [mockEpisode] });

    const result = await updateEpisodeDescription('episode1', 'New description');

    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE episodes SET description = $1 WHERE id = $2 RETURNING *',
      ['New description', 'episode1']
    );
    expect(result.description).toBe('New description');
  });

  it('should clear description when null is provided', async () => {
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

    mockQuery.mockResolvedValue({ rows: [mockEpisode] });

    const result = await updateEpisodeDescription('episode1', '');

    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE episodes SET description = $1 WHERE id = $2 RETURNING *',
      [null, 'episode1']
    );
    expect(result.description).toBeNull();
  });

  it('should handle long descriptions', async () => {
    const longDescription = 'A'.repeat(1000);
    const mockEpisode = {
      id: 'episode1',
      host_id: 'user1',
      title: 'Test Episode',
      description: longDescription,
      state: 'ready',
      session_id: 'session1',
      file_references: {},
      trim_settings: null,
      created_at: new Date(),
    };

    mockQuery.mockResolvedValue({ rows: [mockEpisode] });

    const result = await updateEpisodeDescription('episode1', longDescription);

    expect(result.description).toBe(longDescription);
    expect(result.description.length).toBe(1000);
  });

  it('should handle multi-line descriptions', async () => {
    const multiLineDescription = 'Line 1\nLine 2\nLine 3';
    const mockEpisode = {
      id: 'episode1',
      host_id: 'user1',
      title: 'Test Episode',
      description: multiLineDescription,
      state: 'ready',
      session_id: 'session1',
      file_references: {},
      trim_settings: null,
      created_at: new Date(),
    };

    mockQuery.mockResolvedValue({ rows: [mockEpisode] });

    const result = await updateEpisodeDescription('episode1', multiLineDescription);

    expect(result.description).toBe(multiLineDescription);
    expect(result.description).toContain('\n');
  });
});
