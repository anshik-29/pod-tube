/**
 * Tests for getEpisodesByHostId with filtering functionality
 */

// Mock the database client BEFORE importing queries
jest.mock('@/lib/db/client');

// Import after mock is set up
import { getEpisodesByHostId } from '@/lib/db/queries/episodes';
import { getDbPool } from '@/lib/db/client';

const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
};

describe('getEpisodesByHostId with filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDbPool as jest.Mock).mockReturnValue(mockPool);
  });

  it('should query without filters', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Episode 1', state: 'ready', host_id: 'user1' },
    ];

    mockQuery.mockResolvedValue({ rows: mockEpisodes });

    const result = await getEpisodesByHostId('user1');

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM episodes WHERE host_id = $1 ORDER BY created_at DESC',
      ['user1']
    );
    expect(result).toEqual(mockEpisodes);
  });

  it('should add search filter', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Test Episode', state: 'ready', host_id: 'user1' },
    ];

    mockQuery.mockResolvedValue({ rows: mockEpisodes });

    await getEpisodesByHostId('user1', { search: 'Test' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND (title ILIKE $2 OR id::text ILIKE $2)'),
      expect.arrayContaining(['user1', '%Test%'])
    );
  });

  it('should add state filter', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Episode 1', state: 'ready', host_id: 'user1' },
    ];

    mockQuery.mockResolvedValue({ rows: mockEpisodes });

    await getEpisodesByHostId('user1', { state: 'ready' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND state = $2'),
      expect.arrayContaining(['user1', 'ready'])
    );
  });

  it('should add date filters', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Episode 1', state: 'ready', host_id: 'user1' },
    ];

    mockQuery.mockResolvedValue({ rows: mockEpisodes });

    const dateFrom = new Date('2025-01-01');
    const dateTo = new Date('2025-01-31');

    await getEpisodesByHostId('user1', { dateFrom, dateTo });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND created_at >= $2'),
      expect.arrayContaining([expect.any(Date), expect.any(Date)])
    );
  });

  it('should combine all filters', async () => {
    const mockEpisodes = [
      { id: '1', title: 'Test Episode', state: 'ready', host_id: 'user1' },
    ];

    mockQuery.mockResolvedValue({ rows: mockEpisodes });

    const dateFrom = new Date('2025-01-01');
    const dateTo = new Date('2025-01-31');

    await getEpisodesByHostId('user1', {
      search: 'Test',
      state: 'ready',
      dateFrom,
      dateTo,
    });

    const queryCall = mockQuery.mock.calls[0][0];
    expect(queryCall).toContain('title ILIKE');
    expect(queryCall).toContain('state =');
    expect(queryCall).toContain('created_at >=');
    expect(queryCall).toContain('created_at <=');
  });
});
