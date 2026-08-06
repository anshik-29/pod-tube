/**
 * Tests for Help/Documentation Page
 * 
 * @jest-environment jsdom
 */

import HelpPage from '@/app/(dashboard)/help/page';
import { render, screen } from '@testing-library/react';

// Mock Navbar
jest.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

describe('Help Page', () => {
  it('should render the help page with main sections', () => {
    render(<HelpPage />);

    expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
    expect(screen.getByText(/Get answers to common questions/)).toBeInTheDocument();
  });

  it('should display Quick Start Guide section', () => {
    render(<HelpPage />);

    expect(screen.getByText('Quick Start Guide')).toBeInTheDocument();
    expect(screen.getByText('1. Create a Session')).toBeInTheDocument();
    expect(screen.getByText('2. Start Recording')).toBeInTheDocument();
    expect(screen.getByText('3. Invite Guests')).toBeInTheDocument();
    expect(screen.getByText('4. Stop & Process')).toBeInTheDocument();
    expect(screen.getByText('5. Download')).toBeInTheDocument();
  });

  it('should display FAQ section with common questions', () => {
    render(<HelpPage />);

    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('What browsers are supported?')).toBeInTheDocument();
    expect(screen.getByText('Can I record without a guest?')).toBeInTheDocument();
    expect(screen.getByText('How long does processing take?')).toBeInTheDocument();
    expect(screen.getByText('Can I edit my recordings?')).toBeInTheDocument();
    expect(screen.getByText('What if my recording fails?')).toBeInTheDocument();
    expect(screen.getByText('Can I delete multiple episodes at once?')).toBeInTheDocument();
    expect(screen.getByText('How do I change my email or password?')).toBeInTheDocument();
  });

  it('should display Key Features section', () => {
    render(<HelpPage />);

    expect(screen.getByText('Key Features')).toBeInTheDocument();
    expect(screen.getByText('Real-time Recording')).toBeInTheDocument();
    expect(screen.getByText('Guest Invitations')).toBeInTheDocument();
    expect(screen.getByText('Automatic Processing')).toBeInTheDocument();
    expect(screen.getByText('Trimming & Editing')).toBeInTheDocument();
    expect(screen.getByText('Multiple Formats')).toBeInTheDocument();
    expect(screen.getByText('Search & Filter')).toBeInTheDocument();
  });

  it('should display Tips section', () => {
    render(<HelpPage />);

    expect(screen.getByText('Tips for Best Results')).toBeInTheDocument();
    expect(screen.getByText(/Use a good quality microphone/)).toBeInTheDocument();
    expect(screen.getByText(/Ensure you have a stable internet connection/)).toBeInTheDocument();
  });

  it('should display support section with navigation links', () => {
    render(<HelpPage />);

    expect(screen.getByText('Need More Help?')).toBeInTheDocument();
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
  });

  it('should render Navbar component', () => {
    render(<HelpPage />);

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });
});
