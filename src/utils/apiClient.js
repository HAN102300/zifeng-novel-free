import axios from "axios";

const API_BASE = "/api";

let serverAvailable = null;

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

export const isServerAvailable = () => serverAvailable;

export const testBookSourceAPI = async (source, keyword = "人", page = 1) => {
  const res = await axios.post(
    `${API_BASE}/test-source`,
    {
      source,
      keyword,
      page,
    },
    { timeout: 20000 },
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

export const getTocAPI = async (source, tocUrl) => {
  const res = await axios.post(
    `${API_BASE}/toc`,
    {
      source,
      tocUrl,
    },
    { timeout: 15000 },
  );
  return res.data;
};

export const getContentAPI = async (source, chapterUrl) => {
  const res = await axios.post(
    `${API_BASE}/content`,
    {
      source,
      chapterUrl,
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
