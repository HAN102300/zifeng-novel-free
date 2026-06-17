export const parseHeaders = (headerStr) => {
  try {
    if (!headerStr) return {};
    if (headerStr.includes('<js>')) return {};
    const cleaned = headerStr.replace(/'/g, '"');
    return JSON.parse(cleaned);
  } catch {
    try {
      const headers = {};
      const pairs = headerStr.replace(/[{}'"]/g, '').split(',');
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split(':');
        if (key && valueParts.length) {
          headers[key.trim()] = valueParts.join(':').trim();
        }
      }
      return headers;
    } catch {
      return {};
    }
  }
};
