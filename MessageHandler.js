// Всё, что касается обработки и формирования сообщений

const hashManager = require('./HashManager');
const netInterfaceHandler = require('./NetworkInterfaceHandler');

const MSG_TYPE_SIZE = 1;             // Количество байт под информацию о типе сообщения
const MSG_USER_NAME_LENGTH_SIZE = 2; // Количество байт под информацию о длине имени пользователя
const MSG_FILE_NAME_LENGTH_SIZE = 2; // Количество байт под информацию о длине имени файла
const MSG_FILE_LENGTH_SIZE = 2;      // Количество байт под длину файла
const MSG_USER_ID_SIZE = 16;         // Количество байт под ID пользователя
const MSG_FILE_ID_SIZE = 16;         // Количество байт под ID файла
const MSG_IPV4_SIZE = 4;
const MSG_PORT_SIZE = 2;

const MSG_REQUEST_ONLINE_CODE = 0;             // Код запроса об активности соседей
const MSG_RESPONSE_ONLINE_CODE = 1;            // Код ответа для запроса об активности
const MSG_REQUEST_FILE_INFO_CODE = 2;          // Код запроса информации по хешу
const MSG_RESPONSE_FILE_LINK_CODE = 3;         // Код ответа с передачей информации о хранителе файла
const MSG_RESPONSE_FILE_INFO_CODE = 7;         // Код ответа с передачей информации о файле
const MSG_REQUEST_FILE_LINK_HOLDING_CODE = 8;  // Код запроса на хранение ссылки на файл
const MSG_RESPONSE_FILE_LINK_HOLDING_CODE = 9; // Код подтверждеия об успешном хранении файла
const MSG_REQUEST_FILE_LOAD = 10;              // Код запроса на загрузку файла
const MSG_RESPONSE_FILE_LOAD = 11;             // Код ответа для загрузки файла

module.exports = {
  MSG_REQUEST_ONLINE_CODE: MSG_REQUEST_ONLINE_CODE,
  MSG_RESPONSE_ONLINE_CODE: MSG_RESPONSE_ONLINE_CODE,
  MSG_RESPONSE_FILE_LINK_CODE: MSG_RESPONSE_FILE_LINK_CODE,
  MSG_RESPONSE_FILE_INFO_CODE: MSG_RESPONSE_FILE_INFO_CODE,
  MSG_REQUEST_FILE_LINK_HOLDING_CODE: MSG_REQUEST_FILE_LINK_HOLDING_CODE,
  MSG_RESPONSE_FILE_LINK_HOLDING_CODE: MSG_RESPONSE_FILE_LINK_HOLDING_CODE,
  MSG_REQUEST_FILE_INFO_CODE: MSG_REQUEST_FILE_INFO_CODE,
  MSG_REQUEST_FILE_LOAD: MSG_REQUEST_FILE_LOAD,
  MSG_RESPONSE_FILE_LOAD: MSG_RESPONSE_FILE_LOAD,

  // Формируем сообщение для проверки пользователей
  buildIsOnlineRequest: function (ID, name) {
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

  buildFileInfoRequest: function (ID, dataID) {
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
  buildIsOnlineResponse: function (ID, name) {
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
  buildSaveFileLinkRequest: function (requesterID, hashes, destinationID, address, port) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE + MSG_IPV4_SIZE + MSG_PORT_SIZE);

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

    address = netInterfaceHandler.ipToNum(address);

    message.fill(address, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE + MSG_IPV4_SIZE);

    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE + MSG_IPV4_SIZE +
    MSG_PORT_SIZE - 1] = port;
    port = port >> 8;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE + MSG_IPV4_SIZE +
    MSG_PORT_SIZE - 2] = port;

    return message;
  },

  // Формируем сообщение для подтверждения хранения ссылки на файл
  buildSaveFileLinkResponse: function (responserID, fileID, destinationID, address, port) {
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

    address = netInterfaceHandler.ipToNum(address);

    message.fill(address, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE + MSG_IPV4_SIZE);

    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE + MSG_IPV4_SIZE +
    MSG_PORT_SIZE - 1] = port;
    port = port >> 8;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE + MSG_IPV4_SIZE +
    MSG_PORT_SIZE - 2] = port;

    return message;
  },

  buildFileLinkResponse: function (responserID, fileID, holderID) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE);

    // Указываем тип сообщения
    message[0] = MSG_RESPONSE_FILE_LINK_CODE;

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

  buildFileInfoResponse: function (responserID, fileID, infoLength, name) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE + name.length);
    //let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_NAME_LENGTH_SIZE + name.length);

    // Указываем тип сообщения
    message[0] = MSG_RESPONSE_FILE_INFO_CODE;

    // Получаем буфер из строки с хешем и записываем в сообщение
    responserID = hashManager.strToNumber(responserID);
    message.fill(responserID, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    fileID = hashManager.strToNumber(fileID);
    message.fill(fileID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 1] = infoLength;
    infoLength = infoLength >> 8;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 2] = infoLength;

    let fileNameLength = name.length;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE - 1] = fileNameLength;
    fileNameLength = fileNameLength >> 8;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE - 2] = fileNameLength;

    message.fill(name, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE + name.length);

    return message;
  },

  buildFileLoadRequest: function (requesterID,  fileID) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    message[0] = MSG_REQUEST_FILE_LOAD;

    requesterID = hashManager.strToNumber(requesterID);
    message.fill(requesterID, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    fileID = hashManager.strToNumber(fileID);
    message.fill(fileID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_ID_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    return message;
  },

  buildFileLoadResponse: function (responserID, fileID, data) {
    let message = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + data.length);

    message[0] = MSG_RESPONSE_FILE_LOAD;

    responserID = hashManager.strToNumber(responserID);
    message.fill(responserID, MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

    fileID = hashManager.strToNumber(fileID);
    message.fill(fileID, MSG_TYPE_SIZE + MSG_USER_ID_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

    let dataLength = data.length;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 1] = dataLength;
    dataLength = dataLength >> 8;
    message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 2] = dataLength;

    message.fill(data, MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE,
      MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + data.length);

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
      InfoHash: undefined,
      FileSize: undefined,
      FileContent: undefined,
      SenderAddress: undefined,
      SenderPort: undefined
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

      let address = message.slice(MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE + MSG_IPV4_SIZE);
      address = netInterfaceHandler.ipToStr(address);
      messageData['SenderAddress'] = address;

      messageData['SenderPort'] = message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE + MSG_IPV4_SIZE + MSG_PORT_SIZE - 2];
      messageData['SenderPort'] = messageData['SenderPort'] << 8;
      messageData['SenderPort'] = messageData['SenderPort'] |
        message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE + MSG_IPV4_SIZE + MSG_PORT_SIZE - 1];
    }
    // Если пришло подтверждение хранения ссылки на файл
    else if (messageData['Type'] === MSG_RESPONSE_FILE_LINK_HOLDING_CODE) {

      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

      messageData['FileID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

      messageData['DestinationID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE * 4 + MSG_USER_ID_SIZE);
    }
    // Если пришёл запрос на информацию о файле
    else if (messageData['Type'] === MSG_REQUEST_FILE_INFO_CODE) {
      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);
      messageData['InfoHash'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);
    }
    // Если пришёл ответ на информацию о файле
    else if (messageData['Type'] === MSG_RESPONSE_FILE_INFO_CODE) {

      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

      messageData['InfoHash'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

      messageData['FileSize'] = message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 2];
      messageData['FileSize'] = messageData['FileSize'] << 8;
      messageData['FileSize'] = messageData['FileSize'] |
        message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 1];

      let fileNameLength;
      fileNameLength = message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE - 2];
      fileNameLength = fileNameLength << 8;
      fileNameLength = fileNameLength |
        message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE - 1];

      messageData['FileName'] = message.toString("utf-8",
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE + MSG_FILE_NAME_LENGTH_SIZE);

    }
    // Если пришёл ответ на информацию о файле в виде ID хранителя
    else if (messageData['Type'] === MSG_RESPONSE_FILE_LINK_CODE) {
      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);
      messageData['InfoHash'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);
      messageData['HolderID'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_USER_ID_SIZE);

    }
    else if (messageData['Type'] === MSG_REQUEST_FILE_LOAD) {
      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);

      messageData['InfoHash'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);
    }
    else if (messageData['Type'] === MSG_RESPONSE_FILE_LOAD) {
      messageData['SenderID'] = message.toString("hex", MSG_TYPE_SIZE, MSG_TYPE_SIZE + MSG_USER_ID_SIZE);
      messageData['InfoHash'] = message.toString("hex", MSG_TYPE_SIZE + MSG_USER_ID_SIZE,
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE);

      messageData['FileSize'] = message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 2];
      messageData['FileSize'] = messageData['FileSize'] << 8;
      messageData['FileSize'] = messageData['FileSize'] |
        message[MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE - 1];

      messageData['FileContent'] = message.toString("utf-8",
        MSG_TYPE_SIZE + MSG_USER_ID_SIZE + MSG_FILE_ID_SIZE + MSG_FILE_LENGTH_SIZE)
    }
    return messageData;
  }
};