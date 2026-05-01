import CryptoJS from 'crypto-js';
import CRYPTO_CONFIG from './cryptoConfig';

export const aesDecrypt = (ciphertext, key, iv) => {
  try {
    const encryptedData = CryptoJS.enc.Base64.parse(ciphertext);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encryptedData },
      CryptoJS.enc.Utf8.parse(key),
      {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
};

export const decryptMaoyanContent = (path) => {
  return aesDecrypt(path, CRYPTO_CONFIG.MAOYAN_KEY, CRYPTO_CONFIG.MAOYAN_IV);
};
