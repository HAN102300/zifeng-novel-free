import axios from 'axios';

let isAdminLoggingOut = false;

const requestCache = new Map();
const CACHE_TTL = 30000;

function cachedGet(apiFn, cacheKey) {
  const now = Date.now();
  const cached = requestCache.get(cacheKey);
  if (cached && (now - cached.time) < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }
  return apiFn().then(res => {
    requestCache.set(cacheKey, { data: res, time: Date.now() });
    if (requestCache.size > 50) {
      const oldest = [...requestCache.entries()].sort((a, b) => a[1].time - b[1].time);
      for (let i = 0; i < 10 && i < oldest.length; i++) {
        requestCache.delete(oldest[i][0]);
      }
    }
    return res;
  });
}

export function clearCache(prefix) {
  if (!prefix) {
    requestCache.clear();
    return;
  }
  for (const key of requestCache.keys()) {
    if (key.startsWith(prefix)) requestCache.delete(key);
  }
}

const adminApi = axios.create({
  baseURL: '/api/admin',
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('zifeng_admin_token');
  if (token) {
    config.headers["zifeng_admin_token"] = token;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isAdminLoggingOut) {
      const msg = error.response?.data?.message || "";
      const isTokenInvalid =
        msg.includes("过期") ||
        msg.includes("无效") ||
        msg.includes("其他设备") ||
        msg.includes("踢下线") ||
        msg.includes("请先登录");

      if (isTokenInvalid) {
        isAdminLoggingOut = true;
        localStorage.removeItem('zifeng_admin_token');
        localStorage.removeItem('zifeng_admin_info');
        window.dispatchEvent(new Event('auth-change'));
        window.location.href = '/login';
        setTimeout(() => {
          isAdminLoggingOut = false;
        }, 3000);
      }
    }
    if (error.response?.status === 429) {
      const msg = error.response?.data?.message || '请求过于频繁，请稍后再试';
      error._rateLimited = true;
      error._rateLimitMessage = msg;
    }
    return Promise.reject(error);
  }
);

export const getCaptcha = () => adminApi.get('/auth/captcha');
export const adminLogin = (data) => adminApi.post('/auth/login', data);
export const getAdminInfo = () => cachedGet(() => adminApi.get('/auth/info'), 'adminInfo');
export const getDashboard = () => cachedGet(() => adminApi.get('/dashboard'), 'dashboard');
export const getUsers = (keyword) => cachedGet(() => adminApi.get('/users', { params: { keyword } }), `users:${keyword || 'all'}`);
export const banUser = (id) => adminApi.put(`/users/${id}/ban`).then(r => { clearCache('users:'); return r; });
export const unbanUser = (id) => adminApi.put(`/users/${id}/unban`).then(r => { clearCache('users:'); return r; });
export const getAdmins = () => cachedGet(() => adminApi.get('/admins'), 'admins');
export const createAdmin = (data) => adminApi.post('/admins', data).then(r => { clearCache('admins'); return r; });
export const updateAdmin = (id, data) => adminApi.put(`/admins/${id}`, data).then(r => { clearCache('admins'); return r; });
export const deleteAdmin = (id) => adminApi.delete(`/admins/${id}`).then(r => { clearCache('admins'); return r; });
export const getBookshelf = (keyword) => cachedGet(() => adminApi.get('/reading/bookshelf', { params: { keyword } }), `bookshelf:${keyword || 'all'}`);
export const getReadingHistory = (keyword) => cachedGet(() => adminApi.get('/reading/history', { params: { keyword } }), `history:${keyword || 'all'}`);

const sourceApi = axios.create({
  baseURL: '/api/sources',
  timeout: 15000,
});

sourceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('zifeng_admin_token');
  if (token) {
    config.headers["zifeng_admin_token"] = token;
  }
  return config;
});

sourceApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isAdminLoggingOut) {
      const msg = error.response?.data?.message || "";
      const isTokenInvalid =
        msg.includes("过期") ||
        msg.includes("无效") ||
        msg.includes("其他设备") ||
        msg.includes("踢下线") ||
        msg.includes("请先登录");

      if (isTokenInvalid) {
        isAdminLoggingOut = true;
        localStorage.removeItem('zifeng_admin_token');
        localStorage.removeItem('zifeng_admin_info');
        window.dispatchEvent(new Event('auth-change'));
        window.location.href = '/login';
        setTimeout(() => {
          isAdminLoggingOut = false;
        }, 3000);
      }
    }
    if (error.response?.status === 429) {
      error._rateLimited = true;
      error._rateLimitMessage = error.response?.data?.message || '请求过于频繁，请稍后再试';
    }
    return Promise.reject(error);
  }
);

export const getAdminSources = (keyword) => cachedGet(() => sourceApi.get('/admin/all', { params: { keyword } }), `sources:${keyword || 'all'}`);
export const getAdminSourceStats = () => cachedGet(() => sourceApi.get('/admin/count'), 'sourceStats');
export const createAdminSource = (data) => sourceApi.post('/admin', data).then(r => { clearCache('sources:'); clearCache('sourceStats'); return r; });
export const updateAdminSource = (id, data) => sourceApi.put(`/admin/${id}`, data).then(r => { clearCache('sources:'); clearCache('sourceStats'); return r; });
export const deleteAdminSource = (id) => sourceApi.delete(`/admin/${id}`).then(r => { clearCache('sources:'); clearCache('sourceStats'); return r; });
export const importAdminSources = (data) => sourceApi.post('/admin/import', data).then(r => { clearCache('sources:'); clearCache('sourceStats'); return r; });

const parserApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

function parseSourceRules(source) {
  if (!source) return source;
  const parsed = { ...source };
  const ruleFields = ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore'];
  for (const field of ruleFields) {
    if (typeof parsed[field] === 'string' && parsed[field]) {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {}
    }
  }
  return parsed;
}

export const testSource = (source) => parserApi.post('/test-source', {
  source: parseSourceRules(source),
  keyword: '人',
  page: 1,
  fullTest: false,
});

export const loginSource = (source, mode = 'login') => parserApi.post('/login', {
  source: parseSourceRules(source),
  mode,
});

export const checkLoginState = (source) => parserApi.post('/login', {
  source: parseSourceRules(source),
  mode: 'check',
});

export const importFromUrl = (url) => parserApi.get('/import-from-url', { params: { url } });

export default adminApi;
