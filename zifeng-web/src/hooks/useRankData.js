/* ============================================================
   紫枫免费小说 · 榜单数据获取 Hook
   通过后端 /api/proxy 代理调用外部书源 API，
   避免浏览器跨域 (CORS) 与 HTTPS 站点下的混合内容拦截。
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { rankUrls, parseHeaders } from '../config/themes';
import { getDefaultSource } from '../utils/novelConfig';
import { proxyImageUrl } from '../utils/apiClient';

export function useRankData() {
  const [novels, setNovels] = useState({
    mustRead: [],
    potential: [],
    completed: [],
    updated: [],
    search: [],
    comment: []
  });
  const [loading, setLoading] = useState(true);

  const fetchRankData = useCallback(async (url, key, limit) => {
    const defaultSource = getDefaultSource();
    try {
      const targetUrl = `${defaultSource.bookSourceUrl}${url}`;
      const sourceHeaders = parseHeaders(defaultSource.header);

      // 通过后端代理调用外部书源 API
      const response = await axios.get('/api/proxy', {
        params: {
          url: targetUrl,
          headers: JSON.stringify(sourceHeaders)
        },
        timeout: 15000
      });

      const responseData = response.data;
      if (responseData && responseData.data) {
        const data = responseData.data.slice(0, limit).map((novel, index) => {
          let coverUrl = novel.cover || '';
          // 处理相对路径的封面 URL
          if (
            coverUrl &&
            !coverUrl.startsWith('http') &&
            !coverUrl.startsWith('data:') &&
            !coverUrl.startsWith('//')
          ) {
            coverUrl = `${defaultSource.bookSourceUrl}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`;
          }
          // 将 HTTP 封面 URL 转为同源代理 URL，避免混合内容拦截
          coverUrl = proxyImageUrl(coverUrl);
          return {
            id: novel.novelId || index + 1,
            name: novel.novelName || '未知标题',
            author: novel.authorName || '未知作者',
            cover: coverUrl,
            category: novel.categoryNames && novel.categoryNames.length > 0 ? novel.categoryNames[0].className : '未知分类',
            score: novel.averageScore || 0,
            rankInfo: novel.rankInfo || `${index + 1}`,
            rank: index + 1
          };
        });
        setNovels(prev => ({ ...prev, [key]: data }));
      }
    } catch {
      setNovels(prev => ({ ...prev, [key]: [] }));
    }
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchRankData(rankUrls.mustRead, 'mustRead', 15),
          fetchRankData(rankUrls.potential, 'potential', 8),
          fetchRankData(rankUrls.completed, 'completed', 8),
          fetchRankData(rankUrls.updated, 'updated', 6),
          fetchRankData(rankUrls.search, 'search', 6),
          fetchRankData(rankUrls.comment, 'comment', 6)
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [fetchRankData]);

  return { novels, loading };
}
