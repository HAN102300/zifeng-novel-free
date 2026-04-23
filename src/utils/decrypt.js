// 解密工具类
import CryptoJS from 'crypto-js';

// AES解密函数
export const aesDecrypt = (ciphertext, key, iv) => {
  try {
    // 从Base64解码
    const encryptedData = CryptoJS.enc.Base64.parse(ciphertext);
    
    // 配置解密参数
    const decrypted = CryptoJS.AES.decrypt(
      {
        ciphertext: encryptedData
      },
      CryptoJS.enc.Utf8.parse(key),
      {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    // 转换为UTF8字符串
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
};

// 猫眼看书专用解密函数
export const decryptMaoyanContent = (path) => {
  // 从path中提取加密数据
  const encryptedData = path;
  // 密钥和IV
  const key = 'f041c49714d39908';
  const iv = '0123456789abcdef';
  
  return aesDecrypt(encryptedData, key, iv);
};