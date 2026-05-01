import {
  getBookshelf,
  addToBookshelf,
  removeFromBookshelf,
  getReadingHistory,
  saveReadingProgress as apiSaveProgress,
  getReadingProgress as apiGetProgress,
  deleteReadingHistory,
} from './apiClient';

export const saveUserInfo = (userInfo) => {
  try {
    localStorage.setItem('zifeng_user', JSON.stringify(userInfo));
  } catch (error) {
    console.error("存储用户信息失败:", error);
  }
};

export const getUserInfo = async () => {
  try {
    const localData = localStorage.getItem('zifeng_user');
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (error) {
    console.error("获取用户信息失败:", error);
  }
  return null;
};

export const clearUserInfo = () => {
  try {
    localStorage.removeItem('zifeng_user');
  } catch (error) {
    console.error("清除用户信息失败:", error);
  }
};

export const getBookShelf = async () => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token) {
      return await getBookshelf();
    }
    return [];
  } catch (error) {
    console.error("获取书架数据失败:", error);
    return [];
  }
};

export const addToBookShelf = async (userId, book) => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token && book.bookUrl) {
      await addToBookshelf({
        bookName: book.name,
        author: book.author,
        bookUrl: book.bookUrl,
        coverUrl: book.cover || book.coverUrl,
        summary: book.summary,
        lastChapter: book.lastChapter,
        sourceUrl: book.sourceUrl,
        sourceName: book.sourceName,
        category: book.category,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("添加书籍到书架失败:", error);
    return false;
  }
};

export const removeFromBookShelf = async (userId, bookUrl) => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token && bookUrl) {
      await removeFromBookshelf(bookUrl);
      return true;
    }
    return false;
  } catch (error) {
    console.error("从书架移除书籍失败:", error);
    return false;
  }
};

export const getReadHistory = async () => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token) {
      return await getReadingHistory();
    }
    return [];
  } catch (error) {
    console.error("获取阅读历史失败:", error);
    return [];
  }
};

export const addToReadHistory = async (userId, book) => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token && book.bookUrl) {
      await apiSaveProgress({
        bookUrl: book.bookUrl,
        bookName: book.name,
        author: book.author,
        coverUrl: book.cover || book.coverUrl,
        summary: book.summary,
        lastChapter: book.lastChapter,
        sourceUrl: book.sourceUrl,
        sourceName: book.sourceName,
        chapterIndex: book.chapterIndex || 0,
        chapterName: book.chapterName || '',
        chapterUrl: book.chapterUrl || '',
        progress: book.progress || 0,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("添加书籍到阅读历史失败:", error);
    return false;
  }
};

export const clearReadHistory = async () => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token) {
      await deleteReadingHistory();
      return true;
    }
    return false;
  } catch (error) {
    console.error("清除阅读历史失败:", error);
    return false;
  }
};

export const removeSingleFromReadHistory = async (userId, bookUrl) => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token && bookUrl) {
      await deleteReadingHistory(bookUrl);
      return true;
    }
    return false;
  } catch (error) {
    console.error("删除单条阅读历史失败:", error);
    return false;
  }
};

export const saveReadingProgress = async (userId, bookId, chapterId, progress) => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token) {
      await apiSaveProgress({
        bookUrl: bookId,
        chapterIndex: chapterId,
        progress: progress,
      }).catch(() => {});
    }
  } catch (error) {
    console.error("保存阅读进度失败:", error);
  }
};

export const getReadingProgress = async (userId, bookId) => {
  try {
    const token = localStorage.getItem('zifeng_token');
    if (token && bookId) {
      const data = await apiGetProgress(bookId);
      if (data) {
        return {
          chapterId: data.chapterIndex,
          progress: data.progress,
          lastRead: data.lastRead,
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const updateUserAvatar = async (userId, avatar) => {
  try {
    const currentUser = await getUserInfo();
    if (currentUser) {
      currentUser.avatar = avatar;
      saveUserInfo(currentUser);
    }
    return true;
  } catch (error) {
    console.error("更新用户头像失败:", error);
    return false;
  }
};
