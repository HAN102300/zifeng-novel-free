// IndexedDB数据库工具类

const DB_NAME = "zifeng_novel_db";
const DB_VERSION = 3;

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("数据库打开失败:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (event.oldVersion < 3) {
        if (db.objectStoreNames.contains("users")) {
          db.deleteObjectStore("users");
        }
        const userStore = db.createObjectStore("users", {
          keyPath: "username",
        });
        userStore.createIndex("username", "username", { unique: true });
      }

      if (!db.objectStoreNames.contains("bookshelf")) {
        const bookshelfStore = db.createObjectStore("bookshelf", {
          keyPath: "id",
          autoIncrement: true,
        });
        bookshelfStore.createIndex("username", "username", { unique: false });
        bookshelfStore.createIndex("bookId", "bookId", { unique: false });
      }

      if (!db.objectStoreNames.contains("history")) {
        const historyStore = db.createObjectStore("history", {
          keyPath: "id",
          autoIncrement: true,
        });
        historyStore.createIndex("username", "username", { unique: false });
        historyStore.createIndex("bookId", "bookId", { unique: false });
      }
    };
  });
};

export const saveUser = async (userInfo) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readwrite");
      const store = transaction.objectStore("users");
      const request = store.put(userInfo);
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error("保存用户信息失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("保存用户信息失败:", error);
    return false;
  }
};

export const getUser = async (username) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readonly");
      const store = transaction.objectStore("users");
      const request = store.get(username);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => {
        console.error("获取用户信息失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return null;
  }
};

export const saveBookShelf = async (username, books) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("bookshelf", "readwrite");
      const store = transaction.objectStore("bookshelf");
      const index = store.index("username");
      const deleteRequest = index.openCursor(IDBKeyRange.only(username));

      deleteRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          const addPromises = books.map((book) => {
            return new Promise((addResolve, addReject) => {
              const addRequest = store.add({
                username,
                bookId: book.id,
                name: book.name,
                author: book.author,
                cover: book.cover,
                summary: book.summary || '',
                lastChapter: book.lastChapter || '',
                addedAt: new Date().toISOString(),
              });
              addRequest.onsuccess = () => addResolve();
              addRequest.onerror = (e) => addReject(e.target.error);
            });
          });
          Promise.all(addPromises).then(() => resolve(true)).catch((error) => reject(error));
        }
      };

      deleteRequest.onerror = (event) => {
        console.error("清空书架失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("保存书架失败:", error);
    return false;
  }
};

export const getBookShelf = async (username) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("bookshelf", "readonly");
      const store = transaction.objectStore("bookshelf");
      const index = store.index("username");
      const request = index.openCursor(IDBKeyRange.only(username));
      const books = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const bookData = cursor.value;
          books.push({
            id: bookData.bookId,
            name: bookData.name,
            author: bookData.author,
            cover: bookData.cover,
            summary: bookData.summary || '',
            lastChapter: bookData.lastChapter || '',
          });
          cursor.continue();
        } else {
          resolve(books);
        }
      };

      request.onerror = (event) => {
        console.error("获取书架失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("获取书架失败:", error);
    return [];
  }
};

export const saveReadHistory = async (username, books) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("history", "readwrite");
      const store = transaction.objectStore("history");
      const index = store.index("username");
      const deleteRequest = index.openCursor(IDBKeyRange.only(username));

      deleteRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          const addPromises = books.map((book) => {
            return new Promise((addResolve, addReject) => {
              const addRequest = store.add({
                username,
                bookId: book.id,
                name: book.name,
                author: book.author,
                cover: book.cover,
                summary: book.summary || '',
                lastChapter: book.lastChapter || '',
                progress: book.progress || 0,
                lastRead: book.lastRead || new Date().toISOString(),
              });
              addRequest.onsuccess = () => addResolve();
              addRequest.onerror = (e) => addReject(e.target.error);
            });
          });
          Promise.all(addPromises).then(() => resolve(true)).catch((error) => reject(error));
        }
      };

      deleteRequest.onerror = (event) => {
        console.error("清空阅读历史失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("保存阅读历史失败:", error);
    return false;
  }
};

export const getReadHistory = async (username) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("history", "readonly");
      const store = transaction.objectStore("history");
      const index = store.index("username");
      const request = index.openCursor(IDBKeyRange.only(username));
      const books = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const bookData = cursor.value;
          books.push({
            id: bookData.bookId,
            name: bookData.name,
            author: bookData.author,
            cover: bookData.cover,
            summary: bookData.summary || '',
            lastChapter: bookData.lastChapter || '',
            progress: bookData.progress || 0,
            lastRead: bookData.lastRead,
          });
          cursor.continue();
        } else {
          books.sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead));
          resolve(books);
        }
      };

      request.onerror = (event) => {
        console.error("获取阅读历史失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("获取阅读历史失败:", error);
    return [];
  }
};

export const clearReadHistory = async (username) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("history", "readwrite");
      const store = transaction.objectStore("history");
      const index = store.index("username");
      const request = index.openCursor(IDBKeyRange.only(username));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve(true);
        }
      };

      request.onerror = (event) => {
        console.error("清除阅读历史失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("清除阅读历史失败:", error);
    return false;
  }
};

export const removeSingleHistory = async (username, bookId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("history", "readwrite");
      const store = transaction.objectStore("history");
      const index = store.index("username");
      const request = index.openCursor(IDBKeyRange.only(username));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.bookId === bookId) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve(true);
        }
      };

      request.onerror = (event) => {
        console.error("删除单条阅读历史失败:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("删除单条阅读历史失败:", error);
    return false;
  }
};
