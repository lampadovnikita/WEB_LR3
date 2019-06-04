// Всё, что касается обработки и формирования сообщений

const hashManager = require('./HashManager');

const MSG_TYPE_SIZE = 1;             // Количество байт под информацию о типе сообщения
const MSG_USER_NAME_LENGTH_SIZE = 2; // Количество байт под информацию о длине имени
const MSG_USER_ID_SIZE = 16;         // Количество байт под ID пользователя
const MSG_FILE_ID_SIZE = 16;         // Количество байт под ID файла

const MSG_REQUEST_ONLINE_CODE = 0;             // Код запроса об активности соседей
const MSG_RESPONSE_ONLINE_CODE = 1;            // Код ответа для запроса об активности
const MSG_REQUEST_FILE_INFO_CODE = 2;          // Код запроса информации по хешу
const MSG_RESPONSE_FILE_LINK_CODE = 3;         // Код ответа с передачей информации о хранителе файла
const MSG_RESPONSE_FILE_INFO_CODE = 7;         // Код ответа с передачей информации о файле
const MSG_REQUEST_FILE_LINK_HOLDING_CODE = 8;  // Код запроса на хранение ссылки на файл
const MSG_RESPONSE_FILE_LINK_HOLDING_CODE = 9; // Код подтверждеия об успешном хранении файла
module.exports = {
  MSG_REQUEST_ONLINE_CODE: MSG_REQUEST_ONLINE_CODE,
  MSG_RESPONSE_ONLINE_CODE: MSG_RESPONSE_ONLINE_CODE,
  MSG_RESPONSE_FILE_LINK_CODE: MSG_RESPONSE_FILE_LINK_CODE,
  MSG_REQUEST_FILE_LINK_HOLDING_CODE: MSG_REQUEST_FILE_LINK_HOLDING_CODE,
  MSG_RESPONSE_FILE_LINK_HOLDING_CODE: MSG_RESPONSE_FILE_LINK_HOLDING_CODE,
  MSG_REQUEST_FILE_INFO_CODE: MSG_REQUEST_FILE_INFO_CODE,

  // Формируем сообщение для проверки пользователей
  buildRequestIsOnline: function (ID, name) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE + name.length);
    // Указываем тип сообщения
    message[0] = MSG_REQUEST_ONLINE_CODE;

    // Упаковываем ID из 32 байтной строки в 16 байтное число
    for (let i = 0; i < 16; i++) {
      message[MSG_TYPE_SIZE + i] = parseInt(ID[i * 2], 16);
      message[MSG_TYPE_SIZE + i] = message[MSG_TYPE_SIZE + i] << 4;
      message[MSG_TYPE_SIZE + i] |= parseInt(ID[i * 2 + 1], 16);
    }

    // Упаковываем размер сообщения в 2 байта
    let userNameLength = name.length;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE - 1] = userNameLength;
    userNameLength = userNameLength >> 8;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE - 2] = userNameLength;

    // Добавляем имя
    message.fill(name, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE + name.length);

    return message;
  },

  buildRequestFileInfo: function (ID, dataID) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    // Указываем тип сообщения
    message[0] = MSG_REQUEST_FILE_INFO_CODE;

    // Добавляем в буфер ID пользователя, который запрашивает информацию
    let hash = hashManager.strToNumber(ID);
    message.fill(hash, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    // Добавляем в буфер ID искомой информации
    hash = hashManager.strToNumber(dataID);
    message.fill(hash, MSG_TYPE_SIZE + MSG_USER_ID_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    return message;
  },

  // Формируем сообщение для ответа на проверку активности
  buildResponseIsOnline: function (ID, name) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE + name.length);

    // Указываем тип сообщения
    message[0] = MSG_RESPONSE_ONLINE_CODE;

    // Получаем буфер из строки с хешем и записываем в сообщение
    let hash = hashManager.strToNumber(ID);
    message.fill(hash, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    // Упаковываем размер сообщения в 2 байта
    let userNameLength = name.length;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE - 1] = userNameLength;
    userNameLength = userNameLength >> 8;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE - 2] = userNameLength;

    // Добавляем имя
    message.fill(name, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE + name.length);

    return message;
  },

  // Формируем сообщение для запроса на хранение ссылки на файл
  buildSaveFileLinkRequest: function (requesterID, hashes, destinationID) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE);

    // Указываем тип сообщения
    message[0] = MSG_REQUEST_FILE_LINK_HOLDING_CODE;

    // Получаем буфер из строки с хешем и записываем в сообщение
    requesterID = hashManager.strToNumber(requesterID);
    message.fill(requesterID, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    for (let i = 0; i < 4; i++) {
      let hash = hashManager.strToNumber(hashes[i]);
      message.fill(hash, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * i,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * (i + 1));
    }

    destinationID = hashManager.strToNumber(destinationID);
    message.fill(destinationID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE);

    return message;
  },

  // Формируем сообщение для подтверждения хранения ссылки на файл
  buildSaveFileLinkResponse: function (responserID, fileID, destinationID) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE);

    // Указываем тип сообщения
    message[0] = MSG_RESPONSE_FILE_LINK_HOLDING_CODE;

    // Получаем буфер из строки с хешем и записываем в сообщение
    responserID = hashManager.strToNumber(responserID);
    message.fill(responserID, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    fileID = hashManager.strToNumber(fileID);
    message.fill(fileID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    destinationID = hashManager.strToNumber(destinationID);
    message.fill(destinationID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE);

    return message;
  },

  buildResponseFileLink: function(responserID, fileID, holderID) {

    //[3, IDanswerer, IDdata, IDholder, IPholder, PORTholder]
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE);

    // Указываем тип сообщения
    message[0] = MSG_RESPONSE_FILE_LINK_HOLDING_CODE;

    // Получаем буфер из строки с хешем и записываем в сообщение
    responserID = hashManager.strToNumber(responserID);
    message.fill(responserID, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    fileID = hashManager.strToNumber(fileID);
    message.fill(fileID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    holderID = hashManager.strToNumber(holderID);
    message.fill(holderID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE);

    return message;
    },

  // Функция обработки произвольного сообщения
  processMessage: function (message) {
    // Структура со всей возможной информацией из сообщения
    let messageData = {
      Type: undefined,
      SenderID: undefined,
      SenderName: undefined,
      FileID: undefined,
      FileNameID: undefined,
      FirstNameID: undefined,
      LastNameID: undefined,
      DestinationID: undefined,
      HolderID: undefined,
      InfoHash: undefined
    };

    // Определяем тип
    messageData['Type'] = message[0];

    // Если пришёл ответ об активности
    if (messageData['Type'] === MSG_RESPONSE_ONLINE_CODE) {

      let userNameLength;
      // Распаковываем размер сообщения
      userNameLength = message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE - 2];
      userNameLength = userNameLength << 8;
      userNameLength = userNameLength | message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE - 1];

      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

      messageData['SenderName'] = message.toString("utf-8", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE);
    }
    // Если пришёл запрос на хранение ссылки на файл
    else if (messageData['Type'] === MSG_REQUEST_FILE_LINK_HOLDING_CODE) {

      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

      messageData['FileID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

      messageData['FileNameID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 2);

      messageData['FirstNameID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 2,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 3);

      messageData['LastNameID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_ID_SIZE * 3,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4);

      messageData['DestinationID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE);
    }
    // Если пришло подтверждение хранения ссылки на файл
    else if (messageData['Type'] === MSG_RESPONSE_FILE_LINK_HOLDING_CODE) {

      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

      messageData['FileID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

      /*messageData['FileNameID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 2);

      messageData['FirstNameID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 2,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 3);

      messageData['LastNameID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE * 3,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4);*/

      messageData['DestinationID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE);
    }
    // Если пришёл запрос на информацию о файле
    else if (messageData['Type'] === MSG_REQUEST_FILE_INFO_CODE) {
      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);
      messageData['InfoHash'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);
    }
    else if (messageData['Type'] === MSG_RESPONSE_FILE_LINK_CODE) {
      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);
      messageData['InfoHash'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);
      messageData['HolderID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_ID_SIZE);

    }

    return messageData;
  }
};