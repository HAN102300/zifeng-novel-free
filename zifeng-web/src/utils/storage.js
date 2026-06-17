import {
  getBookshelf,
  addToBookshelf,
  getReadingHistory,
  saveReadingProgress as apiSaveProgress,
} from "./apiClient";

export const getUserInfo = async () => {
  try {
    const localData = localStorage.getItem("zifeng_user");
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (error) {
    console.error("获取用户信息失败:", error);
  }
  return null;
};

export const getBookShelf = async () => {
  try {
    const token = localStorage.getItem("zifeng_token");
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
    const token = localStorage.getItem("zifeng_token");
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

export const addToReadHistory = async (userId, book) => {
  try {
    const token = localStorage.getItem("zifeng_token");
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
        chapterName: book.chapterName || "",
        chapterUrl: book.chapterUrl || "",
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
