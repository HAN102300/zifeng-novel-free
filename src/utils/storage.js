// 存储工具类 - 使用IndexedDB

import {
  saveUser,
  getUser,
  saveBookShelf as dbSaveBookShelf,
  getBookShelf as dbGetBookShelf,
  saveReadHistory as dbSaveReadHistory,
  getReadHistory as dbGetReadHistory,
  clearReadHistory as dbClearReadHistory,
  removeSingleHistory as dbRemoveSingleHistory,
} from "./database";

// 存储键名
const STORAGE_KEYS = {
  USER_INFO: "zifeng_novel_user",
};

// 存储用户信息
export const saveUserInfo = (userInfo) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    // 同时保存到数据库
    saveUser(userInfo);
  } catch (error) {
    console.error("存储用户信息失败:", error);
  }
};

// 获取用户信息
export const getUserInfo = async () => {
  try {
    const localData = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    const localUserInfo = localData ? JSON.parse(localData) : null;

    if (localUserInfo && localUserInfo.loginExpiresAt) {
      const expiresAt = new Date(localUserInfo.loginExpiresAt);
      if (new Date() > expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.USER_INFO);
        return null;
      }
    }

    if (localUserInfo && localUserInfo.username) {
      try {
        const dbUserInfo = await getUser(localUserInfo.username);
        if (dbUserInfo) {
          const merged = { ...dbUserInfo, loginExpiresAt: localUserInfo.loginExpiresAt, lastLogin: localUserInfo.lastLogin };
          localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(merged));
          return merged;
        }
      } catch (dbError) {
        console.warn("IndexedDB读取失败，使用localStorage数据:", dbError);
      }
      return localUserInfo;
    }
    return null;
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return null;
  }
};

// 清除用户信息
export const clearUserInfo = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
  } catch (error) {
    console.error("清除用户信息失败:", error);
  }
};

// 获取用户的书架数据
export const getBookShelf = async (userId) => {
  try {
    return await dbGetBookShelf(userId);
  } catch (error) {
    console.error("获取书架数据失败:", error);
    return [];
  }
};

// 保存用户的书架数据
export const saveBookShelf = async (userId, books) => {
  try {
    await dbSaveBookShelf(userId, books);
  } catch (error) {
    console.error("存储书架数据失败:", error);
  }
};

// 添加书籍到书架
export const addToBookShelf = async (userId, book) => {
  try {
    const books = await getBookShelf(userId);
    const existingIndex = books.findIndex((item) => item.id === book.id);
    if (existingIndex === -1) {
      books.push(book);
      await saveBookShelf(userId, books);
      return true;
    }
    return false;
  } catch (error) {
    console.error("添加书籍到书架失败:", error);
    return false;
  }
};

// 从书架移除书籍
export const removeFromBookShelf = async (userId, bookId) => {
  try {
    const books = await getBookShelf(userId);
    const filteredBooks = books.filter((item) => item.id !== bookId);
    await saveBookShelf(userId, filteredBooks);
    return true;
  } catch (error) {
    console.error("从书架移除书籍失败:", error);
    return false;
  }
};

// 获取用户的阅读历史
export const getReadHistory = async (userId) => {
  try {
    return await dbGetReadHistory(userId);
  } catch (error) {
    console.error("获取阅读历史失败:", error);
    return [];
  }
};

// 保存用户的阅读历史
export const saveReadHistory = async (userId, books) => {
  try {
    // 限制历史记录数量为20条
    const limitedBooks = books.slice(0, 20);
    await dbSaveReadHistory(userId, limitedBooks);
  } catch (error) {
    console.error("存储阅读历史失败:", error);
  }
};

// 添加书籍到阅读历史
export const addToReadHistory = async (userId, book) => {
  try {
    const history = await getReadHistory(userId);
    // 移除已存在的相同书籍
    const filteredHistory = history.filter((item) => item.id !== book.id);
    // 添加到历史记录开头
    filteredHistory.unshift({
      ...book,
      lastRead: new Date().toISOString(),
    });
    await saveReadHistory(userId, filteredHistory);
    return true;
  } catch (error) {
    console.error("添加书籍到阅读历史失败:", error);
    return false;
  }
};

// 清除用户的阅读历史
export const clearReadHistory = async (userId) => {
  try {
    await dbClearReadHistory(userId);
  } catch (error) {
    console.error("清除阅读历史失败:", error);
  }
};

// 删除单条阅读历史
export const removeSingleFromReadHistory = async (userId, bookId) => {
  try {
    return await dbRemoveSingleHistory(userId, bookId);
  } catch (error) {
    console.error("删除单条阅读历史失败:", error);
    return false;
  }
};

// 保存阅读进度
export const saveReadingProgress = async (userId, bookId, chapterId, progress) => {
  try {
    const key = `reading_progress_${userId}_${bookId}`;
    const data = {
      chapterId,
      progress,
      lastRead: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("保存阅读进度失败:", error);
    return false;
  }
};

// 获取阅读进度
export const getReadingProgress = async (userId, bookId) => {
  try {
    const key = `reading_progress_${userId}_${bookId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("获取阅读进度失败:", error);
    return null;
  }
};

// 保存用户信息到用户列表
export const saveUserToUsers = (userInfo) => {
  try {
    saveUser(userInfo);
  } catch (error) {
    console.error("保存用户到用户列表失败:", error);
  }
};

// 更新用户头像
export const updateUserAvatar = async (userId, avatar) => {
  try {
    // 从数据库获取用户信息
    const user = await getUser(userId);
    if (user) {
      user.avatar = avatar;
      await saveUser(user);
    }
    // 同时更新当前用户信息
    const currentUser = await getUserInfo();
    if (currentUser && currentUser.username === userId) {
      currentUser.avatar = avatar;
      saveUserInfo(currentUser);
    }
    return true;
  } catch (error) {
    console.error("更新用户头像失败:", error);
    return false;
  }
};
