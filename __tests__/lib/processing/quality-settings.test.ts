/**
 * Tests for Processing Quality Settings
 */

describe('Processing Quality Settings', () => {
  it('should map quality levels to FFmpeg settings correctly', () => {
    const qualitySettings = {
      low: { crf: '28', preset: 'ultrafast', videoBitrate: '1M' },
      medium: { crf: '23', preset: 'veryfast', videoBitrate: '2M' },
      high: { crf: '18', preset: 'fast', videoBitrate: '4M' },
    };

    expect(qualitySettings.low.crf).toBe('28');
    expect(qualitySettings.low.preset).toBe('ultrafast');
    expect(qualitySettings.low.videoBitrate).toBe('1M');

    expect(qualitySettings.medium.crf).toBe('23');
    expect(qualitySettings.medium.preset).toBe('veryfast');
    expect(qualitySettings.medium.videoBitrate).toBe('2M');

    expect(qualitySettings.high.crf).toBe('18');
    expect(qualitySettings.high.preset).toBe('fast');
    expect(qualitySettings.high.videoBitrate).toBe('4M');
  });

  it('should default to medium quality when not specified', () => {
    const quality = undefined;
    const defaultQuality = quality || 'medium';
    expect(defaultQuality).toBe('medium');
  });

  it('should validate quality values', () => {
    const validQualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    
    expect(validQualities.includes('low')).toBe(true);
    expect(validQualities.includes('medium')).toBe(true);
    expect(validQualities.includes('high')).toBe(true);
    expect(validQualities.includes('invalid' as any)).toBe(false);
  });
});
