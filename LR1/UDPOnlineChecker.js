const dgram = require('dgram');
const readline = require('readline');

const MSG_TYPE_SIZE = 1;   // Количество байт под информацию о типе сообщения
const MSG_LENGTH_SIZE = 2; // Количество байт под информацию об остальной длине сообщения

const MSG_REQUEST_CODE = 0;  // Код запроса
const MSG_RESPONSE_CODE = 1; // Код ответа

const PORT = 41234;
const BROADCAST_ADDRESS = '192.168.0.255';

const CHECK_INTERVAL = 3000; // Интервал повторений опроса

const dgramSocket = dgram.createSocket("udp4");

// Для считывания текста с консоли
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Массив с информацией о всех online пользователях
let onlineUserInfo = [];

let userName;
let userId;

// Флаг, показывающий, что пользователь подключен (информация об online пользователях собирается первый раз)
let isConnected = false;

// Когда сокет начал слушать
dgramSocket.on('listening', function () {
  let serverAddress = dgramSocket.address();
  console.log('Listening UDP on ' + serverAddress.address + ":" + serverAddress.port);
});

// Когда на сокет пришло сообщение
dgramSocket.on('message', function (msg, rinfo) {
  // Если пользователь не ввёл имя, то считаем его неподключенным и игнорируем входящие сообщения
  if (userName === undefined) {
    return
  }

  // Определяем тип сообщения
  let msgType = msg[0];

  // Если пришёл запрос
  if (msgType === MSG_REQUEST_CODE) {
    // Формируем сообщение для ответа
    let responseMsg = Buffer.allocUnsafe(MSG_TYPE_SIZE + MSG_LENGTH_SIZE + userName.length + (userId.toString()).length + 1);

    responseMsg[0] = MSG_RESPONSE_CODE; // 1 в первом байте означает ответ
    // Упаковываем размер сообщения в 2 байта
    let length = userName.length + (userId.toString()).length + 1;
    responseMsg[MSG_TYPE_SIZE + MSG_LENGTH_SIZE - 1] = length;
    length = length >> 8;
    responseMsg[MSG_TYPE_SIZE + MSG_LENGTH_SIZE - 2] = length;
    // Добавляем имя
    responseMsg.fill(userName, MSG_TYPE_SIZE + MSG_LENGTH_SIZE, MSG_TYPE_SIZE + MSG_LENGTH_SIZE + userName.length);
    // Добавляем разделитель имени и ID
    responseMsg[MSG_TYPE_SIZE + MSG_LENGTH_SIZE + userName.length] = ':'.charCodeAt(0);
    // Добавляем ID
    responseMsg.fill(userId.toString(), MSG_TYPE_SIZE + MSG_LENGTH_SIZE + userName.length + 1);

    // Отсылаем ответ на адрес отправителя
    dgramSocket.send(responseMsg, 0, responseMsg.length, PORT, rinfo.address);
  }
  // Если пришёл ответ на запрос
  else if (msgType === MSG_RESPONSE_CODE) {
    let msgLength;
    // Распаковываем размер сообщения
    msgLength = msg[MSG_TYPE_SIZE + MSG_LENGTH_SIZE - 2];
    msgLength = msgLength << 8;
    msgLength = msgLength | msg[MSG_TYPE_SIZE + MSG_LENGTH_SIZE - 1];
    // Получаем текст сообщения
    let msgText = msg.toString('utf-8', MSG_TYPE_SIZE + MSG_LENGTH_SIZE);
    // Добавляем информацию о пользователе в массив
    onlineUserInfo.push(msgText);
  }
});

// Когда сокет создан
dgramSocket.bind(PORT, function () {
  console.log('Socket bound');
  dgramSocket.setBroadcast(true);

  // Запрашиваем ввод имени
  rl.question('Enter your name: ', (name) => {
    // После того, как ввели имя
    userName = name;
    rl.close();

    // В качестве ID используем кол-во мс, прошедших с 1 января 1970 г.
    userId = Date.now();
    // Предварительно вызвыаем, чтобы не ждать интервального времени перед первым вызовом
    loopFunction();

    // Задаём периодичность выполнения для функции
    setInterval(loopFunction, CHECK_INTERVAL);
  });
});

// Функция, которая выполняется каждые CHECK_INTERVAL мс
function loopFunction() {
  // Если не подключились, пропускаем этап вывода на экран информации об online пользователях
  // Подключение в данном случае - первый вызов этой функции
  if (isConnected === true) {
    // Выводим информацию об online пользователях, которую сформировали с предыдущей рассылки
    console.log("Current Online:");
    while (onlineUserInfo.length) {
      // Попутно очищаем массив для дальнейшего заполнения новой информацией
      console.log(onlineUserInfo.pop());
    }
  } else {
    console.log("Connecting...");
    isConnected = true;
  }

  // Проверяем online, отсылая всем запросы
  checkOnline();
}

// Функция, в которой выполняется широковещательная рассылка
function checkOnline() {
  // Формируем сообщение для проверки пользователей
  let requestMsg = Buffer.allocUnsafe(MSG_TYPE_SIZE);
  requestMsg[0] = MSG_REQUEST_CODE; // 0 в бервом байте означает запрос

  // Отсылаем запрос
  dgramSocket.send(requestMsg, 0, requestMsg.length, PORT, BROADCAST_ADDRESS);
}
