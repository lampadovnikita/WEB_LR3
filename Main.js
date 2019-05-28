const dgram = require('dgram');
const readline = require('readline');

const hashManager = require('./HashManager');
const dataManager = require('./DataManager');
const messageHandler = require('./MessageHandler');
const netInterfaceHandler = require('./NetworkInterfaceHandler');

const PORT = 41234;
const BROADCAST_ADDRESS = netInterfaceHandler.getBroadcastAddress();

const CONNECTION_TIME = 3000; // Время подключения(первого сбора информации), мс
const CHECK_INTERVAL = 10000; // Интервал повторений опроса, мс

// Для считывания текста с консоли
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


// Массив с информацией о всех online пользователях
// Каждый элемент представлен следующей структурой: ID, Name
// Как в этом языке делать массив структуры??????????????????????????
let onlineUsers = {
  users: []
};

let currentUserName;
let currentUserID;

// Файлы, хеш которых нужно отослать
let filesToSend = undefined;

// Флаг, показывающий, что пользователь подключен (информация об online пользователях собирается первый раз)
let isConnected = false;

const dgramSocket = dgram.createSocket("udp4");

// Когда сокет начал слушать
dgramSocket.on('listening', function () {
  let serverAddress = dgramSocket.address();
  console.log('Listening UDP on ' + serverAddress.address + ":" + serverAddress.port);
});

// Когда на сокет пришло сообщение
dgramSocket.on('message', function (message, rinfo) {
  // Если пользователь не ввёл имя, то считаем его неподключенным и игнорируем входящие сообщения
  if (currentUserName === undefined) {
    return;
  }

  // Получаем данные о сообщении из обработчика
  let messageData = messageHandler.processMessage(message);

  // Если пришёл запрос на проверку активности
  if (messageData['Type'] === messageHandler.MSG_REQUEST_ONLINE_CODE) {
    // Формируем и отправляем ответ
    let responseMessage = messageHandler.buildResponseIsOnline(currentUserID, currentUserName);
    dgramSocket.send(responseMessage, 0, responseMessage.length, PORT, rinfo.address);
  }
  // Если пришёл ответ об активности
  else if (messageData['Type'] === messageHandler.MSG_RESPONSE_ONLINE_CODE) {
    // Добавляем информацию о пользователе в массив
    onlineUsers.users.push({
      ID: messageData['SenderID'],
      Name: messageData['SenderName'],
    });
  }
  // Если пришёл запрос на хранение ссылки на файл
  else if (messageData['Type'] === messageHandler.MSG_REQUEST_FILE_LINK_HOLDING_CODE) {
    // Если сообщение пришло самому себе, игнорируем
    if (messageData['SenderID'] === currentUserID) {
      return;
    }

    // Если запрос адресован нам
    if (currentUserID === messageData['DestinationID']) {
      console.log('-------------------------------------------------------------');
      console.log('Request for saving file link');
      console.log('Sender ID: ' + messageData['SenderID']);
      console.log('Destination ID: ' + messageData['DestinationID']);
      console.log('File ID: ' + messageData['FileID']);

      // Записываем ссылку на файл
      dataManager.writeFileLink(messageData['FileID'], messageData['SenderID']);

      console.log('Link saved');
      console.log('-------------------------------------------------------------');

      // Создаём сообщение для подтверждения сохранения
      let responseMessage = messageHandler.buildSaveFileLinkResponse(currentUserID, messageData['FileID'],
        messageData['SenderID']);

      dgramSocket.send(responseMessage, 0, responseMessage.length, PORT, rinfo.address);
    }
  }
  // Если пришло подтверждение хранения ссылки на файл
  else if (messageData['Type'] === messageHandler.MSG_RESPONSE_FILE_LINK_HOLDING_CODE) {
    console.log('-------------------------------------------------------------');
    console.log('Validate of saving file link');
    console.log('Sender ID: ' + messageData['SenderID']);
    console.log('file ID: ' + messageData['FileID']);
    console.log('-------------------------------------------------------------');

    // Сохраняем информацию о записанном файле
    // Удаляем файл, ссылку которого сохранили, из структуры
    for (let [key, value] of filesToSend) {
      if (value === messageData['FileID']) {
        dataManager.writeFileInfo(value, key);
        filesToSend.delete(key);
        break;
      }
    }
  }
});

// Когда сокет создан
dgramSocket.bind(PORT, function () {
  console.log('Socket bound');

  dgramSocket.setBroadcast(true);

  // Проверяем новые файлы
  filesToSend = dataManager.refreshFileStorageData();

  // Считываем данные о текущем пользователе
  let userInfo = dataManager.readUserInfo();

  // Если данные ещё не записаны
  if (userInfo === undefined) {

    // Расчитываем ID пользователя
    currentUserID = hashManager.getUserHash();

    // Запрашиваем ввод имени
      rl.question('Enter your name: ', (name) => {
        // После того, как ввели имя
        currentUserName = name;
        rl.close();

        // Записываем данные о пользователе в файл
        dataManager.writeUserInfo(currentUserID, currentUserName);

        // Вызываем функцию для проверки онлайна
        checkOnline();
        // Первый раз запускаем главную функцию чере CONNECTION_TIME мс
        setTimeout(loopFunction, CONNECTION_TIME);

        console.log('Connecting...');

      });
  }
  // Если данные о пользователе считаны из файла
  else {

    currentUserID = userInfo['ID'];
    currentUserName = userInfo['Name'];

    // Вызываем функцию для проверки онлайна
    checkOnline();
    // Первый раз запускаем главную функцию чере CONNECTION_TIME мс
    setTimeout(loopFunction, CONNECTION_TIME);

    console.log('Connecting...');
  }
});

// Функция, которая выполняется каждые CHECK_INTERVAL мс
function loopFunction() {

  // Если нужно передать ссылку на новые файлы
  if (filesToSend !== undefined) {

    for (let [key, value] of filesToSend) {
      // Расстояние между хешами
      let distance;
      // Минимальное расстояние между хешами
      let minDistance = hashManager.strToNumber('ffffffffffffffffffffffffffffffff');
      // Индекс элемента с минимальным расстоянием
      let minIndex = -1;

      for (let i = 0; i < onlineUsers.users.length; i++) {
        // Не учитываем самого себя
        if (onlineUsers.users[i]['ID'] === currentUserID) {
          continue;
        }

        distance = hashManager.getDistance(value[0], onlineUsers.users[i]['ID']);

        // Сравнение буферов с хешами
        let compareRes = Buffer.compare(minDistance, distance);

        // Если минимальное расстояние больше текущего
        if (compareRes === 1) {
          minDistance = distance;
          minIndex = i;
        }
      }
      // Если был хоть один другой активный пользователь
      if (minIndex !== -1) {
        // Формируем сообщение для запроса на хранение ссылки на файл
        let requestMessage = messageHandler.buildSaveFileLinkRequest(currentUserID, value,
          onlineUsers.users[minIndex]['ID']);

        dgramSocket.send(requestMessage, 0, requestMessage.length, PORT, BROADCAST_ADDRESS);
      }
    }
  }

  // Выводим информацию об online пользователях, которую сформировали с предыдущей рассылки
  console.log("Current Online:");
  while (onlineUsers.users.length) {
    // Попутно очищаем массив для дальнейшего заполнения новой информацией
    console.log(onlineUsers.users.pop());
  }

  // Проверяем online, отсылая всем запросы
  checkOnline();

  // Если функция вызывается первый раз, то задаём периодичность вызова
  if (isConnected === false) {
    isConnected = true;
    setInterval(loopFunction, CHECK_INTERVAL);
  }
}

// Функция, в которой выполняется широковещательная рассылка
function checkOnline() {
  let requestMessage = messageHandler.buildRequestIsOnline(currentUserID, currentUserName);

  // Отсылаем запрос
  dgramSocket.send(requestMessage, 0, requestMessage.length, PORT, BROADCAST_ADDRESS);
}
