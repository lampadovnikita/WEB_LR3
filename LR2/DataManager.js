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
const FILE_LINKS_PATH = './data/fileLinks.txt';

// Путь к файлу, в котором записана информация о хранящихся у пользователя файлах
const FILE_STORAGE_INFO_PATH = './data/fileStorageInfo.txt';

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
    data = data.split('\n');
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

    fs.writeFile(USER_INFO_PATH, userID + '\n' + userName, (err) => {
      if (err) {
        throw err;
      }
    });
  },

  // Записываем ссылку на для указанного ID файла
  writeFileLink: function (fileID, link) {
    verifyDir(DATA_PATH);

    fs.appendFile(FILE_LINKS_PATH, fileID + ' ' + link + '\n', {}, function (err) {
      if (err) {
        throw err;
      }
    });
  },

  writeFileInfo: function(fileID, fileName) {
    verifyDir(DATA_PATH);

    fs.appendFileSync(FILE_STORAGE_INFO_PATH, fileID + ' ' + fileName + '\n');
  },

  // Обновляем информацию о хранилище файлов
  refreshFileStorageData: function () {
    if (!verifyDir(DATA_PATH)) {
      verifyDir(FILE_STORAGE_PATH);
    }

    // Создаём файл с информацией, если он не существует
    if (!fs.existsSync(FILE_STORAGE_INFO_PATH)) {
      fs.closeSync(fs.openSync(FILE_STORAGE_INFO_PATH, 'w'));
    }

    // Информация о реально хранящихся файлах в папке-хранилище
    let storedFiles = fs.readdirSync(FILE_STORAGE_PATH);

    // Информация о файлах, которые уже записаны
    let recordedFiles = fs.readFileSync(FILE_STORAGE_INFO_PATH);

    if (recordedFiles.length !== 0) {
      // Удаляем последний символ, т.к. это начало пустой строки
      recordedFiles = recordedFiles.toString().substring(0, recordedFiles.length - 1);
      // Разбиваем на отдельные строки
      recordedFiles = recordedFiles.toString().split('\n');
    }

    let recordedFilesMap = new Map();
    let filesToRecord = new Map();

    // Переводим информацию о уже записанных файлах в структуру Map: FileName -> FileID
    for (let i = 0; i < recordedFiles.length; i++) {
      recordedFilesMap.set(recordedFiles[i].substring(33, recordedFiles[i].length), recordedFiles[i].substring(0, 32));
    }

    // Определяем и сохраняем информацию о нофых файлах, которые необходимо сохранить
    for (let i = 0; i < storedFiles.length; i++) {
      if (path.extname(storedFiles[i]) === '.txt') {
        if (!recordedFilesMap.has(storedFiles[i])) {
          filesToRecord.set(storedFiles[i], hashManager.getFileHash(storedFiles[i]));
        }
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