import CryptoJS from '@ohos/crypto-js'

// const text = "iUb37wSg/3kkYbfGS5Y3Vq7cBJt+aXdPQbAcYCFM9kcfB1Kc4efnjkD4KBuaahjg"
const key = "f041c49714d39908"
const iv  = "0123456789abcdef"
// const decryptedText = decryptAesCbc(text,key,iv)
// console.log("解密后的结果为：",decryptedText)

function decryptAesCbc(ciphertext: string):string{
  const decryptedBytes = CryptoJS.AES.decrypt(ciphertext,CryptoJS.enc.Utf8.parse(key),{
    iv: CryptoJS.enc.Utf8.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding:CryptoJS.pad.Pkcs7
  });
  return decryptedBytes.toString(CryptoJS.enc.Utf8)
}

export {decryptAesCbc}
