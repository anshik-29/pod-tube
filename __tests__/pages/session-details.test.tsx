/**
 * Tests for Session Details Page
 * 
 * @jest-environment jsdom
 */

import SessionDetailPage from '@/app/(dashboard)/sessions/[id]/page';
import { render, screen, waitFor } from '@testing-library/react';

// Mock dependencies
jest.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

jest.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user1', email: 'test@example.com' } }),
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'session1' }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock fetch
global.fetch = jest.fn();
global.alert = jest.fn();

const localStorageMock = {
  getItem: jest.fn(() => 'test-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('Session Details Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render session information when session is loaded', async () => {
    const mockSession = {
      id: 'session1',
      guest_token: 'guest-token-123',
      state: 'completed',
      recording_started_at: '2024-01-01T12:00:00Z',
      created_at: '2024-01-01T10:00:00Z',
    };

    const mockEpisodes = [
      {
        id: 'episode1',
        session_id: 'session1',
        title: 'Test Episode',
        state: 'ready',
        created_at: '2024-01-01T13:00:00Z',
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      });

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Session Information')).toBeInTheDocument();
    expect(screen.getByText('session1')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should display associated episode when available', async () => {
    const mockSession = {
      id: 'session1',
      guest_token: 'guest-token-123',
      state: 'completed',
      recording_started_at: '2024-01-01T12:00:00Z',
      created_at: '2024-01-01T10:00:00Z',
    };

    const mockEpisodes = [
      {
        id: 'episode1',
        session_id: 'session1',
        title: 'Test Episode',
        state: 'ready',
        created_at: '2024-01-01T13:00:00Z',
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      });

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Associated Episode')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Episode')).toBeInTheDocument();
    expect(screen.getByText('View Episode')).toBeInTheDocument();
  });

  it('should display message when no episode is associated', async () => {
    const mockSession = {
      id: 'session1',
      guest_token: 'guest-token-123',
      state: 'idle',
      recording_started_at: null,
      created_at: '2024-01-01T10:00:00Z',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ episodes: [] }),
      });

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Associated Episode')).toBeInTheDocument();
    });

    expect(screen.getByText(/No episode has been created/)).toBeInTheDocument();
  });

  it('should display guest invitation link', async () => {
    const mockSession = {
      id: 'session1',
      guest_token: 'guest-token-123',
      state: 'idle',
      recording_started_at: null,
      created_at: '2024-01-01T10:00:00Z',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ episodes: [] }),
      });

    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Guest Invitation Link')).toBeInTheDocument();
    });

    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByTitle('Send via email')).toBeInTheDocument();
  });

  it('should display session timeline', async () => {
    const mockSession = {
      id: 'session1',
      guest_token: 'guest-token-123',
      state: 'completed',
      recording_started_at: '2024-01-01T12:00:00Z',
      created_at: '2024-01-01T10:00:00Z',
    };

    const mockEpisodes = [
      {
        id: 'episode1',
        session_id: 'session1',
        title: 'Test Episode',
        state: 'ready',
        created_at: '2024-01-01T13:00:00Z',
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ episodes: mockEpisodes }),
      });

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Timeline')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Session Created').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recording Started').length).toBeGreaterThan(0);
    expect(screen.getByText('Episode Created')).toBeInTheDocument();
  });

  it('should render Navbar component', async () => {
    const mockSession = {
      id: 'session1',
      guest_token: 'guest-token-123',
      state: 'idle',
      recording_started_at: null,
      created_at: '2024-01-01T10:00:00Z',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: mockSession }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ episodes: [] }),
      });

    render(<SessionDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });
  });
});
