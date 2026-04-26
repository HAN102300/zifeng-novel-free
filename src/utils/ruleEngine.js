import { proxyRequest, checkServerHealth, isServerAvailable } from './apiClient';

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export const fetchWithCorsProxy = async (url, options = {}) => {
  try {
    const result = await proxyRequest(url);
    return { ok: true, text: async () => result, json: async () => result };
  } catch {}

  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(url);
      const response = await fetch(proxyUrl, { ...options, signal: options.signal || AbortSignal.timeout(12000) });
      if (response.ok) return response;
    } catch {
      continue;
    }
  }

  try {
    const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(8000) });
    return response;
  } catch (e) {
    throw new Error(`请求失败：${e.message}`);
  }
};

export { checkServerHealth, isServerAvailable };
