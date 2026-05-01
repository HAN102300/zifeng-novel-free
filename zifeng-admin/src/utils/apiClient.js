import axios from "axios";

const API_BASE = "/api";
const BACKEND_BASE = "/api";

const backendAxios = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 15000,
});

let serverAvailable = null;
let backendAvailable = null;

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
    const res = await backendAxios.get("/sources", { timeout: 3000 });
    backendAvailable = res.status === 200;
    return true;
  } catch {
    backendAvailable = false;
    return false;
  }
};

export const isServerAvailable = () => serverAvailable;
export const isBackendAvailable = () => backendAvailable;

export const testBookSourceAPI = async (source, keyword = "人", page = 1, fullTest = false) => {
  const res = await axios.post(
    `${API_BASE}/test-source`,
    { source, keyword, page, fullTest },
    { timeout: fullTest ? 60000 : 20000 },
  );
  return res.data;
};

export const searchBooksAPI = async (source, keyword, page = 1) => {
  const res = await axios.post(
    `${API_BASE}/search`,
    { source, keyword, page },
    { timeout: 20000 },
  );
  return res.data;
};

export const getExploreAPI = async (source, exploreUrl) => {
  const res = await axios.post(
    `${API_BASE}/explore`,
    { source, exploreUrl },
    { timeout: 20000 },
  );
  return res.data;
};

export const getBookInfoAPI = async (source, bookUrl, bookData = null) => {
  const res = await axios.post(
    `${API_BASE}/book-info`,
    { source, bookUrl, bookData },
    { timeout: 15000 },
  );
  return res.data;
};

export const getTocAPI = async (source, tocUrl, book = null) => {
  const res = await axios.post(
    `${API_BASE}/toc`,
    { source, tocUrl, book },
    { timeout: 15000 },
  );
  return res.data;
};

export const getContentAPI = async (source, chapterUrl, book = null, chapter = null) => {
  const res = await axios.post(
    `${API_BASE}/content`,
    { source, chapterUrl, book, chapter },
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
    { json },
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

export const proxyPostRequest = async (url, method = "GET", headers = {}, body = null) => {
  const res = await axios.post(
    `${API_BASE}/proxy`,
    { url, method, headers, body },
    { timeout: 15000 },
  );
  return res.data;
};

export const getUserBookSources = async () => {
  const res = await backendAxios.get("/sources");
  return res.data?.data || [];
};

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
