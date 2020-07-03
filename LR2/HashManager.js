// Файл, содержащий скрипты для получения и обработки хешей

const crypto = require('crypto');

const netIntefaceHandler = require('./NetworkInterfaceHandler');

const HASH_SIZE = 16;

module.exports = {
  // Получам хеш пользователя по его MAC адресу
  getUserHash: function () {

    let macAddress;

    macAddress = netIntefaceHandler.getInterfaceElement('mac');
    if (macAddress === undefined) {
      throw new Error('Unable to find MAC address');
    }

    console.log('MAC address: ' + macAddress);

    // Убираем из строки все символы ':'
    macAddress = macAddress.replace(/:/g, '');
    let userHash = crypto.createHash('md5').update(macAddress).digest("hex");

    console.log('User hash: ' + userHash);

    return userHash;
  },

  // Получаем хеш файла по его имени
  getFileHash: function (fileName) {
    fileName = fileName.replace(/[.]txt/, '');

    fileName = fileName.toLowerCase();
    let fileHash = crypto.createHash('md5').update(fileName).digest("hex");

    return fileHash;
  },

  // Получаем расстояние между двумя хешпми в виде числового буфера
  getDistance: function (firstHash, secondHash) {
    firstHash = this.strToNumber(firstHash);
    secondHash = this.strToNumber(secondHash);

    let distance = Buffer.allocUnsafe(HASH_SIZE);

    for (let i = 0; i < HASH_SIZE; i++) {
      distance[i] = firstHash[i] ^ secondHash[i];
    }

    return distance;
  },

  // Конвертируем 32 байтную строку с хешем в 16 байтный буфер
  strToNumber: function (hashStr) {
    let hash = Buffer.allocUnsafe(HASH_SIZE);

    for (let i = 0; i < HASH_SIZE; i++) {
      hash[i] = parseInt(hashStr[i * 2], 16);
      hash[i] = hash[i] << 4;
      hash[i] |= parseInt(hashStr[i * 2 + 1], 16);
    }

    return hash;
  }
};