// Файл, содержащий скрипты для работы с данными приложения

const fs = require('fs');
const path = require('path');

const hashManager = require('./HashManager');

// Папка, в которой хранятся все файлы с данными
const DATA_PATH = './data';

// Папка, в которой хранятся файлы пользователя
const FILE_STORAGE_PATH = './data/fileStorage';

// Путь к файлу с информацией о пользователе
const USER_INFO_PATH = './data/userInfo.txt';

// Путь к файлу, в котором хранится информация о том, где следует искать какой-либо файл
const FILE_LINKS_PATH = './data/fileLinks';

// Папка, в которой хранятся файлы с информацией о хеше каждого файла
const FILE_STORAGE_INFO_PATH = './data/fileStorageInfo';

const SEARCH_INFO_PATH = './data/searchInfo.txt';

module.exports = {

  // Считываем данные текущего пользователя из файла
  readUserInfo: function () {
    // Если папки не существовало, возваращаем undefined, т.к. и файла с информацией пользователя точно не было
    if (!verifyDir(DATA_PATH)) {
      return undefined
    }

    // Проверяем, существует ли файл с информацией пользователя
    if (!fs.existsSync(USER_INFO_PATH)) {
      return undefined;
    }
    // Структура с данными пользователя
    let userInfo = {
      ID: undefined,
      Name: undefined
    };

    let data = fs.readFileSync(USER_INFO_PATH, 'utf-8');
    data = data.split('\r\n');
    userInfo['ID'] = data[0];
    userInfo['Name'] = data[1];

    if (userInfo['Name'] === undefined || userInfo['ID'] === undefined) {
      return undefined;
    }

    return userInfo;

  },

  // Записываем данные о пользователе в файл
  writeUserInfo: function (userID, userName) {
    verifyDir(DATA_PATH);

    fs.writeFile(USER_INFO_PATH, userID + '\r\n' + userName, (err) => {
      if (err) {
        throw err;
      }
    });
  },

  // Записываем ссылку на для указанного ID файла
  writeFileLink: function (hashes, link, address, port) {
    verifyDir(DATA_PATH);
    verifyDir(FILE_LINKS_PATH);

    fs.writeFileSync(FILE_LINKS_PATH + '/' + hashes[0] + '.txt',
      link + ' ' + address + ' ' + port + '\r\n' + hashes[1] + '\r\n' + hashes[2] + '\r\n' + hashes[3]);
  },

  writeFileInfo: function (fileName, hashes) {
    verifyDir(DATA_PATH);
    fs.writeFileSync(FILE_STORAGE_INFO_PATH + '/' + fileName,
    hashes[0] + '\r\n' + hashes[1] + '\r\n' + hashes[2] + '\r\n' + hashes[3]);

    verifyDir(FILE_STORAGE_INFO_PATH);
  },

  // Считываем информацию о том, что нужно искать у других пользователей
  readSearchInfo: function () {
    verifyDir(DATA_PATH);

    if (!fs.existsSync(SEARCH_INFO_PATH)) {
      fs.open(SEARCH_INFO_PATH, 'w', function (err, fd) {
        if (err) throw err;

        fs.close(fd, function (err) {
          if (err) throw err;
        });
      });

      return undefined;
    }

    // Структура с данными о искомом файле
    let searchInfo = {
      InfoType: undefined,
      FileHash: undefined,
      FileName: undefined,
      FileLength: undefined,
    };

    let searchStr = fs.readFileSync(SEARCH_INFO_PATH);
    searchStr = searchStr.toString();
    if (searchStr.length === 0) {
      return undefined;
    }

    searchStr = searchStr.split(' ');

    searchInfo['InfoType'] = searchStr[0];
    if (searchInfo['InfoType'] === 'Hash') {
      searchInfo['FileHash'] = searchStr[1];
    }
    else if (searchInfo['InfoType'] === 'Name') {
      searchInfo['FileName'] = searchStr[1];
      if (searchStr.length > 2) {
        searchInfo['FileName'] += ' ' + searchStr[2];
      }
    }
    else {
      searchInfo = undefined;
    }

    return searchInfo;
  },

  // Поиск файла в каталоге по хешу
  searchFile: function (hash) {
    verifyDir(DATA_PATH);
    verifyDir(FILE_STORAGE_INFO_PATH);

    let fileInfo = {
      FileHash: undefined,
      FileName: undefined,
      FileSize: undefined,
    };

    let storedFilesInfo = fs.readdirSync(FILE_STORAGE_INFO_PATH);
    for (let i = 0; i < storedFilesInfo.length; i++) {
      let fileHashes = fs.readFileSync(FILE_STORAGE_INFO_PATH + '/' + storedFilesInfo[i]);
      fileHashes = fileHashes.toString();
      fileHashes = fileHashes.split('\r\n');

      for (let j = 0; j < fileHashes.length; j++) {
        if (fileHashes[j] === hash) {
          fileInfo['FileHash'] = hash;
          fileInfo['FileName'] = storedFilesInfo[i];
          fileInfo['FileSize'] = fs.statSync(FILE_STORAGE_PATH + '/' + storedFilesInfo[i])['size'];
          return fileInfo;
        }
      }
    }

    return undefined;
  },

  // Поиск хранителя файла по хешу
  searchLink: function (hash) {
    verifyDir(DATA_PATH);
    verifyDir(FILE_LINKS_PATH);

    let storedFilesLinks = fs.readdirSync(FILE_LINKS_PATH);
    for (let i = 0; i < storedFilesLinks.length; i++) {
      let fileHashes = fs.readFileSync(FILE_LINKS_PATH + '/' + storedFilesLinks[i]);
      fileHashes = fileHashes.toString();
      fileHashes = fileHashes.split('\r\n');

      let handlerID = fileHashes.shift();
      fileHashes.push(storedFilesLinks[i].replace(/[.]txt/, ''));

      for (let j = 0; j < fileHashes.length; j++) {
        if (fileHashes[j] === hash) {
          return handlerID;
        }
      }
    }

    return undefined;
  },

  getFileContent: function (fileName) {
    let content = fs.readFileSync(FILE_STORAGE_PATH + '/' + fileName);

    return content;
  },

  // Обновляем информацию о хранилище файлов
  refreshFileStorageData: function () {
    verifyDir(DATA_PATH);
    verifyDir(FILE_STORAGE_PATH);
    verifyDir(FILE_STORAGE_INFO_PATH);

    // Информация о реально хранящихся файлах в папке-хранилище
    let storedFiles = fs.readdirSync(FILE_STORAGE_PATH);

    // Информация о файлах, которые уже записаны
    //let recordedFiles = fs.readFileSync(FILE_STORAGE_INFO_PATH);
    let recordedFiles = fs.readdirSync(FILE_STORAGE_INFO_PATH);

    let filesToRecord = new Map();

    // Определяем и сохраняем информацию о новых файлах, которые необходимо сохранить
    for (let i = 0; i < storedFiles.length; i++) {
      if (k = recordedFiles.indexOf(storedFiles[i]) === -1) {
        filesToRecord.set(storedFiles[i], hashManager.getFileHashes(FILE_STORAGE_PATH + '/' + storedFiles[i]));
      }
    }

    if (filesToRecord.size > 0) {
      return filesToRecord;
    }
    else {
      return undefined;
    }
  }
};

// Функция, которая создаёт папку, если она не существует
// Возвращает true, если папка существовала до этого
function verifyDir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
    return false
  }
  else {
    return true;
  }
}