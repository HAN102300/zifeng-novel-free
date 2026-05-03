import axios from "axios";

const API_BASE = "/api";

let serverAvailable = null;
let backendAvailable = null;

const getAuthToken = () => localStorage.getItem("zifeng_token");

const backendAxios = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

let isLoggingOut = false;

backendAxios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers["zifeng_token"] = token;
  }
  return config;
});

backendAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isLoggingOut) {
      const msg = error.response?.data?.message || "";
      const isTokenInvalid =
        msg.includes("过期") ||
        msg.includes("无效") ||
        msg.includes("其他设备") ||
        msg.includes("踢下线") ||
        msg.includes("请先登录");

      if (isTokenInvalid) {
        isLoggingOut = true;
        localStorage.removeItem("zifeng_token");
        localStorage.removeItem("zifeng_user");
        localStorage.removeItem("zifeng_token_expires");
        window.dispatchEvent(new Event("auth-expired"));
        setTimeout(() => {
          isLoggingOut = false;
        }, 3000);
      }
    }
    return Promise.reject(error);
  },
);

export const checkServerHealth = async () => {
  try {
    const res = await axios.get(`${API_BASE}/health`, { timeout: 3000 });
    serverAvailable = res.data?.status === "ok";
    return serverAvailable;
  } catch {
    serverAvailable = false;
    return false;
  }
};

export const checkBackendHealth = async () => {
  try {
    const res = await backendAxios.get("/auth/info", { timeout: 3000 });
    backendAvailable = true;
    return true;
  } catch (e) {
    if (e.response?.status === 401) {
      backendAvailable = true;
      return true;
    }
    backendAvailable = false;
    return false;
  }
};

export const isServerAvailable = () => serverAvailable;
export const isBackendAvailable = () => backendAvailable;

export const testBookSourceAPI = async (source, keyword = "人", page = 1, fullTest = false) => {
  const res = await axios.post(
    `${API_BASE}/test-source`,
    {
      source,
      keyword,
      page,
      fullTest,
    },
    { timeout: fullTest ? 60000 : 20000 },
  );
  return res.data;
};

export const searchBooksAPI = async (source, keyword, page = 1) => {
  const res = await axios.post(
    `${API_BASE}/search`,
    {
      source,
      keyword,
      page,
    },
    { timeout: 20000 },
  );
  return res.data;
};

export const getExploreAPI = async (source, exploreUrl) => {
  const res = await axios.post(
    `${API_BASE}/explore`,
    {
      source,
      exploreUrl,
    },
    { timeout: 20000 },
  );
  return res.data;
};

export const getBookInfoAPI = async (source, bookUrl, bookData = null) => {
  const res = await axios.post(
    `${API_BASE}/book-info`,
    {
      source,
      bookUrl,
      bookData,
    },
    { timeout: 15000 },
  );
  return res.data;
};

export const getTocAPI = async (source, tocUrl, book = null) => {
  const res = await axios.post(
    `${API_BASE}/toc`,
    {
      source,
      tocUrl,
      book,
    },
    { timeout: 15000 },
  );
  return res.data;
};

export const getContentAPI = async (source, chapterUrl, book = null, chapter = null) => {
  const res = await axios.post(
    `${API_BASE}/content`,
    {
      source,
      chapterUrl,
      book,
      chapter,
    },
    { timeout: 15000 },
  );
  return res.data;
};

export const importFromUrlAPI = async (url) => {
  const res = await axios.get(`${API_BASE}/import-from-url`, {
    params: { url },
    timeout: 20000,
  });
  return res.data;
};

export const importFromJsonAPI = async (json) => {
  const res = await axios.post(
    `${API_BASE}/import-from-json`,
    {
      json,
    },
    { timeout: 10000 },
  );
  return res.data;
};

export const proxyRequest = async (url) => {
  const res = await axios.get(`${API_BASE}/proxy`, {
    params: { url },
    timeout: 15000,
  });
  return res.data;
};

export const proxyPostRequest = async (
  url,
  method = "GET",
  headers = {},
  body = null,
) => {
  const res = await axios.post(
    `${API_BASE}/proxy`,
    {
      url,
      method,
      headers,
      body,
    },
    { timeout: 15000 },
  );
  return res.data;
};

// ========== SpringBoot Backend APIs ==========

export const authLogin = async (username, password, rememberMe = false) => {
  const res = await backendAxios.post("/auth/login", { username, password, rememberMe });
  if (res.data?.success && res.data?.data?.token) {
    localStorage.setItem("zifeng_token", res.data.data.token);
    const userData = {
      id: res.data.data.userId,
      username: res.data.data.username,
      avatar: res.data.data.avatar,
    };
    localStorage.setItem("zifeng_user", JSON.stringify(userData));
    if (res.data.data.expiresAt) {
      localStorage.setItem("zifeng_token_expires", String(res.data.data.expiresAt));
    }
  }
  return res.data;
};

export const authRegister = async (username, password, email) => {
  const res = await backendAxios.post("/auth/register", { username, password, email });
  return res.data;
};

export const authLogout = () => {
  localStorage.removeItem("zifeng_token");
  localStorage.removeItem("zifeng_user");
  localStorage.removeItem("zifeng_token_expires");
};

export const getCurrentUser = async () => {
  const res = await backendAxios.get("/auth/info");
  return res.data?.data;
};

export const sendResetCode = async (email) => {
  const res = await backendAxios.post("/auth/send-reset-code", { email });
  return res.data;
};

export const resetPassword = async (data) => {
  const res = await backendAxios.post("/auth/reset-password", data);
  return res.data;
};

export const updateProfile = async (avatar, email) => {
  const res = await backendAxios.put("/auth/profile", { avatar, email });
  return res.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await backendAxios.post('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const changePassword = async (oldPassword, newPassword) => {
  const res = await backendAxios.put("/auth/password", { oldPassword, newPassword });
  return res.data;
};

export const getBookshelf = async () => {
  const res = await backendAxios.get("/bookshelf");
  return res.data?.data || [];
};

export const addToBookshelf = async (bookData) => {
  const res = await backendAxios.post("/bookshelf", bookData);
  return res.data;
};

export const removeFromBookshelf = async (bookUrl) => {
  const res = await backendAxios.delete("/bookshelf", { data: { bookUrl } });
  return res.data;
};

export const checkBookInShelf = async (bookUrl) => {
  const res = await backendAxios.get("/bookshelf/check", { params: { bookUrl } });
  return res.data?.data || false;
};

export const saveReadingProgress = async (progressData) => {
  const res = await backendAxios.post("/reading/progress", progressData);
  return res.data;
};

export const getReadingProgress = async (bookUrl) => {
  const res = await backendAxios.get("/reading/progress", { params: { bookUrl } });
  return res.data?.data || null;
};

export const getReadingHistory = async () => {
  const res = await backendAxios.get("/reading/history");
  return res.data?.data || [];
};

export const deleteReadingHistory = async (bookUrl) => {
  const res = await backendAxios.delete("/reading/history", { data: { bookUrl } });
  return res.data;
};

export const getUserBookSources = async () => {
  const res = await backendAxios.get("/sources");
  return res.data?.data || [];
};

export const getAllEnabledSources = () => backendAxios.get('/sources/public/all');

export const getEnabledBookSources = async () => {
  const res = await backendAxios.get("/sources/enabled");
  return res.data?.data || [];
};

export const addBookSource = async (sourceData) => {
  const res = await backendAxios.post("/sources", sourceData);
  return res.data;
};

export const deleteBookSource = async (bookSourceUrl) => {
  const res = await backendAxios.delete("/sources", { data: { bookSourceUrl } });
  return res.data;
};

export const toggleBookSource = async (bookSourceUrl, enabled) => {
  const res = await backendAxios.put("/sources/toggle", { bookSourceUrl, enabled });
  return res.data;
};

export const importBookSources = async (sources) => {
  const res = await backendAxios.post("/sources/import", sources);
  return res.data;
};
