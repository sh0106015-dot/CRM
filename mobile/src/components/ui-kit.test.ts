import { describe, expect, it } from '@jest/globals';

import { daysSince } from './ui-kit';

describe('daysSince', () => {
  it('null 이면 연락 이력 없음', () => {
    expect(daysSince(null)).toBe('연락 이력 없음');
  });

  it('오늘/미래는 "오늘"', () => {
    expect(daysSince(new Date().toISOString())).toBe('오늘');
    expect(daysSince(new Date(Date.now() + 3_600_000).toISOString())).toBe('오늘');
  });

  it('과거 날짜는 N일 전', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000 - 1000).toISOString();
    expect(daysSince(threeDaysAgo)).toBe('3일 전');
  });
});
