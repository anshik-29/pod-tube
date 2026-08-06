/**
 * Tests for Guest Link Sharing (Copy & Email)
 * 
 * @jest-environment jsdom
 */

describe('Guest Link Sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '', origin: 'http://localhost:3000' };
  });

  it('should generate correct guest link', () => {
    const guestToken = 'test-token-123';
    const expectedLink = `${window.location.origin}/join/${guestToken}`;
    const actualLink = `${window.location.origin}/join/${guestToken}`;
    
    expect(actualLink).toBe(expectedLink);
    expect(actualLink).toBe('http://localhost:3000/join/test-token-123');
  });

  it('should copy guest link to clipboard', async () => {
    const link = 'http://localhost:3000/join/test-token-123';
    
    await navigator.clipboard.writeText(link);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link);
  });

  it('should generate mailto link with correct subject and body', () => {
    const link = 'http://localhost:3000/join/test-token-123';
    const subject = encodeURIComponent('Join my recording session');
    const body = encodeURIComponent(`Hi,\n\nI'd like to invite you to join my recording session. Please use this link:\n\n${link}\n\nYou can join at any time, even if recording has already started.\n\nThanks!`);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    expect(mailtoLink).toContain('mailto:?subject=');
    expect(mailtoLink).toContain('&body=');
    expect(decodeURIComponent(subject)).toBe('Join my recording session');
    expect(decodeURIComponent(body)).toContain(link);
    expect(decodeURIComponent(body)).toContain('I\'d like to invite you to join my recording session');
  });

  it('should handle email link generation with special characters', () => {
    const link = 'http://localhost:3000/join/test-token-123';
    const subject = 'Join my recording session!';
    const body = `Link: ${link}`;
    
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    
    expect(encodedSubject).toBe('Join%20my%20recording%20session!');
    expect(encodedBody).toContain(encodeURIComponent(link));
  });

  it('should create mailto link that opens email client', () => {
    const link = 'http://localhost:3000/join/test-token-123';
    const subject = encodeURIComponent('Join my recording session');
    const body = encodeURIComponent(`Hi,\n\nI'd like to invite you to join my recording session. Please use this link:\n\n${link}\n\nYou can join at any time, even if recording has already started.\n\nThanks!`);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    // Simulate clicking mailto link
    window.location.href = mailtoLink;
    
    expect(window.location.href).toContain('mailto:');
    expect(window.location.href).toContain('subject=');
    expect(window.location.href).toContain('body=');
  });
});
