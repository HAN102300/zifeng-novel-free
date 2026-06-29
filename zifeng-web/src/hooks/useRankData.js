/* ============================================================
   紫枫免费小说 · 榜单数据获取 Hook
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { rankUrls, parseHeaders } from '../config/themes';
import { getDefaultSource } from '../utils/novelConfig';

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
      const response = await axios.get(`${defaultSource.bookSourceUrl}${url}`, {
        headers: parseHeaders(defaultSource.header)
      });

      if (response.data && response.data.data) {
        const data = response.data.data.slice(0, limit).map((novel, index) => ({
          id: novel.novelId || index + 1,
          name: novel.novelName || '未知标题',
          author: novel.authorName || '未知作者',
          cover: novel.cover || '',
          category: novel.categoryNames && novel.categoryNames.length > 0 ? novel.categoryNames[0].className : '未知分类',
          score: novel.averageScore || 0,
          rankInfo: novel.rankInfo || `${index + 1}`,
          rank: index + 1
        }));
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
