// Файл, содержащий скрипты для получения и обработки хешей

const fs = require('fs');
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

  getFileHashes: function (path) {
    let hashes = [];
    hashes.push(this.getFileHash(path));
    let pathParts = path.split('/');
    let fileName = pathParts[pathParts.length - 1];

    fileName = fileName.replace(/[.]txt/, '');
    fileName = fileName.split(' ');

    hashes.push(this.getFileNameHash(fileName[0], fileName[1]));
    hashes.push(this.getFileNameHash(fileName[0], null));
    hashes.push(this.getFileNameHash(null, fileName[1]));

    return hashes;
  },

  // Получаем хеш файла по его содержимому
  getFileHash: function (path) {
    let fileData = fs.readFileSync(path);

    let hash = crypto.createHash('md5').update(fileData).digest("hex");
    return hash
  },

  // Получаем хеш файла по его полному имени, если заданы оба аргумента
  // Получаем хеш по имени в назвнии файла, если задан только первый аргумент
  // Получаем хеш по фамилии в назвнии файла, если задан только второй аргумент
  getFileNameHash: function (firstName, lastName) {
    let strToHash = '';

    if (firstName !== null && firstName !== undefined) {
      strToHash += firstName;
    }
    if (lastName !== null && lastName !== undefined) {
      if (strToHash.length !== 0) {
        strToHash += ' ';
      }
      strToHash += lastName;
    }
    strToHash = strToHash.toLowerCase();

    let hash = crypto.createHash('md5').update(strToHash).digest("hex");
    return hash;
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