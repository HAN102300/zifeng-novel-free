import axios from "axios";

const API_BASE = "/api";

/**
 * 将外部 HTTP 图片 URL 转为通过后端图片代理的同源 URL
 * 解决 HTTPS 页面加载 HTTP 图片被混合内容策略拦截的问题
 * 使用 /api/img-proxy 而非 /api/proxy，因为后者会把二进制数据当文本处理导致图片损坏
 */
export const proxyImageUrl = (url) => {
  if (!url) return '';
  // 已经是同源或 HTTPS 的 URL 直接返回
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('https://')) return url;
  // HTTP URL 走图片专用代理
  if (url.startsWith('http://')) return `/api/img-proxy?url=${encodeURIComponent(url)}`;
  return url;
};

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
      const hadToken = !!error.config?.headers?.["zifeng_token"];
      if (hadToken) {
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
    }
    return Promise.reject(error);
  },
);

// ========== Parse APIs (通过SpringBoot后端代理) ==========

export const testBookSourceAPI = async (
  source,
  keyword = "人",
  page = 1,
  fullTest = false,
) => {
  const res = await backendAxios.post(
    "/parse/test-source",
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
  const res = await backendAxios.post(
    "/parse/search",
    {
      source,
      keyword,
      page,
    },
    { timeout: 20000 },
  );
  const data = res.data;
  if (data && data.data) return data.data;
  return data;
};

export const getBookInfoAPI = async (source, bookUrl, bookData = null) => {
  const res = await backendAxios.post(
    "/parse/book-info",
    {
      source,
      bookUrl,
      bookData,
    },
    { timeout: 15000 },
  );
  const data = res.data;
  if (data && data.data) return data.data;
  return data;
};

export const getTocAPI = async (source, tocUrl, book = null) => {
  const res = await backendAxios.post(
    "/parse/toc",
    {
      source,
      tocUrl,
      book,
    },
    { timeout: 15000 },
  );
  const data = res.data;
  if (data && data.data) return data.data;
  return data;
};

export const getContentAPI = async (
  source,
  chapterUrl,
  book = null,
  chapter = null,
) => {
  const res = await backendAxios.post(
    "/parse/content",
    {
      source,
      chapterUrl,
      book,
      chapter,
    },
    { timeout: 15000 },
  );
  const data = res.data;
  if (data && data.data) return data.data;
  return data;
};

export const importFromUrlAPI = async (url) => {
  const res = await backendAxios.get("/sources/import-url", {
    params: { url },
    timeout: 20000,
  });
  return res.data;
};

export const proxyRequest = async (url) => {
  const res = await backendAxios.get("/parse/proxy", {
    params: { url },
    timeout: 15000,
  });
  return res.data;
};

// ========== SpringBoot Backend APIs ==========

export const getCaptcha = async () => {
  try {
    const response = await backendAxios.get('/auth/captcha');
    return response.data;
  } catch (error) {
    console.error('获取验证码失败:', error);
    return null;
  }
};

export const authLogin = async (username, password, rememberMe = false, captchaId = '', captchaCode = '') => {
  const res = await backendAxios.post('/auth/login', { username, password, rememberMe, captchaId, captchaCode });
  if (res.data?.success && res.data?.data?.token) {
    localStorage.setItem("zifeng_token", res.data.data.token);
    const userData = {
      id: res.data.data.userId,
      username: res.data.data.username,
      avatar: res.data.data.avatar,
    };
    localStorage.setItem("zifeng_user", JSON.stringify(userData));
    if (res.data.data.expiresAt) {
      localStorage.setItem(
        "zifeng_token_expires",
        String(res.data.data.expiresAt),
      );
    }
  }
  return res.data;
};

export const authRegister = async (username, password, email, captchaId = '', captchaCode = '') => {
  const res = await backendAxios.post('/auth/register', { username, password, email, captchaId, captchaCode });
  if (res.data?.success && res.data?.data?.token) {
    localStorage.setItem("zifeng_token", res.data.data.token);
    const userData = {
      id: res.data.data.userId,
      username: res.data.data.username,
      avatar: res.data.data.avatar,
    };
    localStorage.setItem("zifeng_user", JSON.stringify(userData));
    if (res.data.data.expiresAt) {
      localStorage.setItem(
        "zifeng_token_expires",
        String(res.data.data.expiresAt),
      );
    }
    window.dispatchEvent(new Event("auth-login"));
  }
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

export const verifyUserForReset = async (username, email) => {
  const res = await backendAxios.post("/auth/verify-email", { username, email });
  return res.data;
};

export const resetPasswordDev = async (data) => {
  // data 应包含 { username, email, newPassword }
  const res = await backendAxios.post("/auth/reset-password-dev", data);
  return res.data;
};

export const updateProfile = async (avatar, email) => {
  const res = await backendAxios.put("/auth/profile", { avatar, email });
  return res.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await backendAxios.post("/user/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
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
  const res = await backendAxios.get("/bookshelf/check", {
    params: { bookUrl },
  });
  return res.data?.data || false;
};

export const saveReadingProgress = async (progressData) => {
  const res = await backendAxios.post("/reading/progress", progressData);
  return res.data;
};

export const getReadingProgress = async (bookUrl) => {
  const res = await backendAxios.get("/reading/progress", {
    params: { bookUrl },
  });
  return res.data?.data || null;
};

export const getReadingHistory = async () => {
  const res = await backendAxios.get("/reading/history");
  return res.data?.data || [];
};

export const deleteReadingHistory = async (bookUrl) => {
  const res = await backendAxios.delete("/reading/history", {
    data: { bookUrl },
  });
  return res.data;
};

export const getAllEnabledSources = () =>
  backendAxios.get("/sources/public/all");

export const toggleBookSource = async (bookSourceUrl, enabled) => {
  const res = await backendAxios.put("/sources/toggle", {
    bookSourceUrl,
    enabled,
  });
  return res.data;
};

export const importBookSources = async (sources) => {
  const res = await backendAxios.post("/sources/import", sources);
  return res.data;
};

// ========== Aggregated APIs (通过SpringBoot后端) ==========

export const unifiedBookInfoAPI = async (source, bookUrl, bookData) => {
  const res = await backendAxios.post(
    "/parse/book-info/unified",
    {
      source,
      bookUrl,
      book: bookData,
    },
    { timeout: 15000 },
  );
  return res.data?.data || res.data;
};

// ========== Feedback (反馈系统) ==========

export const submitFeedback = async (data) => {
  const res = await backendAxios.post("/feedback", data, { timeout: 15000 });
  return res.data?.data || res.data;
};

export const getMyFeedbacks = async () => {
  const res = await backendAxios.get("/feedback/mine");
  return res.data?.data || res.data;
};
