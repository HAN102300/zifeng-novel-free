import axios from 'axios';

let isAdminLoggingOut = false;

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
    return Promise.reject(error);
  }
);

export const getCaptcha = () => adminApi.get('/auth/captcha');
export const adminLogin = (data) => adminApi.post('/auth/login', data);
export const getAdminInfo = () => adminApi.get('/auth/info');
export const getDashboard = () => adminApi.get('/dashboard');
export const getUsers = (keyword) => adminApi.get('/users', { params: { keyword } });
export const banUser = (id) => adminApi.put(`/users/${id}/ban`);
export const unbanUser = (id) => adminApi.put(`/users/${id}/unban`);
export const getAdmins = () => adminApi.get('/admins');
export const createAdmin = (data) => adminApi.post('/admins', data);
export const updateAdmin = (id, data) => adminApi.put(`/admins/${id}`, data);
export const deleteAdmin = (id) => adminApi.delete(`/admins/${id}`);
export const getBookshelf = (keyword) => adminApi.get('/reading/bookshelf', { params: { keyword } });
export const getReadingHistory = (keyword) => adminApi.get('/reading/history', { params: { keyword } });

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
    return Promise.reject(error);
  }
);

export const getAdminSources = (keyword) => sourceApi.get('/admin/all', { params: { keyword } });
export const getAdminSourceStats = () => sourceApi.get('/admin/count');
export const createAdminSource = (data) => sourceApi.post('/admin', data);
export const updateAdminSource = (id, data) => sourceApi.put(`/admin/${id}`, data);
export const deleteAdminSource = (id) => sourceApi.delete(`/admin/${id}`);
export const importAdminSources = (data) => sourceApi.post('/admin/import', data);

const parserApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const testSource = (source) => parserApi.post('/test-source', source);
export const importFromUrl = (url) => parserApi.get('/import-from-url', { params: { url } });

export default adminApi;
