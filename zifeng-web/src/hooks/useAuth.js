/* ============================================================
   紫枫免费小说 · 认证状态 Hook
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/apiClient';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('zifeng_token');
  });

  const [userInfo, setUserInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('zifeng_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // 登录后同步 userInfo 到 localStorage
  useEffect(() => {
    if (isLoggedIn && userInfo) {
      localStorage.setItem('zifeng_user', JSON.stringify(userInfo));
    }
  }, [isLoggedIn, userInfo]);

  // 初始化: 验证 token 有效性
  useEffect(() => {
    const loadUserInfo = async () => {
      const token = localStorage.getItem('zifeng_token');
      if (!token) return;
      try {
        const user = await getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          setUserInfo(user);
          localStorage.setItem('zifeng_user', JSON.stringify(user));
        }
      } catch (e) {
        if (e.response?.status === 401) {
          clearAuthState();
        }
      }
    };
    loadUserInfo();

    const handleAuthLogin = () => loadUserInfo();
    window.addEventListener('auth-login', handleAuthLogin);
    return () => window.removeEventListener('auth-login', handleAuthLogin);
  }, []);

  // 监听 auth-expired 事件
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsLoggedIn(false);
      setUserInfo(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  // Token 过期定时检查
  useEffect(() => {
    const checkTokenExpiration = () => {
      const expiresAt = localStorage.getItem('zifeng_token_expires');
      if (!expiresAt) return;
      const remaining = Number(expiresAt) - Date.now();
      if (remaining <= 0) {
        clearAuthState();
      }
    };
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, []);

  // 心跳 + token 周期性校验
  useEffect(() => {
    let failCount = 0;
    let heartbeatInterval, tokenCheckInterval;

    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem('zifeng_token');
        if (!token) return;
        await (await import('../utils/apiClient')).backendAxios.post('/auth/heartbeat', null, { timeout: 5000 });
      } catch { /* ignore */ }
    };

    const checkToken = async () => {
      const token = localStorage.getItem('zifeng_token');
      if (!token) return;
      try {
        const user = await getCurrentUser();
        if (user) {
          failCount = 0;
          setUserInfo(user);
          localStorage.setItem('zifeng_user', JSON.stringify(user));
        }
      } catch (e) {
        if (e.response?.status === 401) {
          clearAuthState();
        } else {
          failCount++;
        }
      }
    };

    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, 120000);
    tokenCheckInterval = setInterval(checkToken, 120000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(tokenCheckInterval);
    };
  }, []);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('zifeng_token');
    localStorage.removeItem('zifeng_user');
    localStorage.removeItem('zifeng_token_expires');
    setIsLoggedIn(false);
    setUserInfo(null);
  }, []);

  return { isLoggedIn, setIsLoggedIn, userInfo, setUserInfo, clearAuthState };
}
