import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { api, ApiError, setAuthToken } from './api';
import { API_BASE_URL } from './config';

type MockRes = { ok: boolean; status: number; text: () => Promise<string> };
type FetchMock = ReturnType<typeof jest.fn>;

const res = (data: unknown, status = 200): MockRes => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (data === undefined ? '' : JSON.stringify(data)),
});

describe('api client', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = jest.fn(() => Promise.resolve(res({})));
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    setAuthToken(null);
  });

  const last = () => {
    const call = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return { url: call[0], init: call[1], headers: call[1].headers as Record<string, string> };
  };

  it('GET 요청 URL 구성 + 기본적으로 인증 헤더 없음', async () => {
    await api.dashboard();
    const { url, init, headers } = last();
    expect(url).toBe(`${API_BASE_URL}/ai/dashboard`);
    expect(init.method).toBe('GET');
    expect(headers.Authorization).toBeUndefined();
  });

  it('setAuthToken 후 Bearer 헤더 부착 / null 이면 제거', async () => {
    setAuthToken('TKN');
    await api.dashboard();
    expect(last().headers.Authorization).toBe('Bearer TKN');

    setAuthToken(null);
    await api.dashboard();
    expect(last().headers.Authorization).toBeUndefined();
  });

  it('쿼리 파라미터 인코딩 + 빈 값 제외', async () => {
    await api.customers({ q: '김 고객', filter: 'VIP', page: 2, sort: undefined });
    const { url } = last();
    expect(url).toContain('q=%EA%B9%80%20%EA%B3%A0%EA%B0%9D');
    expect(url).toContain('filter=VIP');
    expect(url).toContain('page=2');
    expect(url).not.toContain('sort=');
  });

  it('POST 는 JSON 바디 전송', async () => {
    await api.login({ email: 'a@b.c', password: 'secret12' });
    const { url, init, headers } = last();
    expect(url).toBe(`${API_BASE_URL}/auth/login`);
    expect(init.method).toBe('POST');
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.c', password: 'secret12' });
  });

  it('2xx 아니면 ApiError (배열 message 는 콤마 조인)', async () => {
    fetchMock.mockResolvedValueOnce(res({ message: ['이름 필수', '전화 필수'] }, 400));
    await expect(api.dashboard()).rejects.toBeInstanceOf(ApiError);
    fetchMock.mockResolvedValueOnce(res({ message: ['이름 필수', '전화 필수'] }, 400));
    await expect(api.dashboard()).rejects.toMatchObject({
      status: 400,
      message: '이름 필수, 전화 필수',
    });
  });

  it('빈 2xx 바디는 null 반환', async () => {
    fetchMock.mockResolvedValueOnce(res(undefined, 204));
    await expect(api.unregisterDevice('t')).resolves.toBeNull();
  });

  it('경로 파라미터 인코딩 (encodeURIComponent 사용 엔드포인트)', async () => {
    await api.deleteTag('건강 & 보험');
    expect(last().url).toBe(`${API_BASE_URL}/tags/${encodeURIComponent('건강 & 보험')}`);
    expect(last().init.method).toBe('DELETE');
  });
});
