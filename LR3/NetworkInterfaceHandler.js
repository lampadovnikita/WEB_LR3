// Файл, содержащий функции для работы c информацией о сетевом подключении

const os = require('os');

const PSEUDO_INTERFACE_KEY = 'Loopback Pseudo-Interface';
const IPV4_SIZE = 4;

module.exports = {
  // Функция для получения элемента IPv4 networkinterfaces по ключу
  getInterfaceElement: function (elementKey) {

    let netInterface = os.networkInterfaces();

    let element;
    Object.keys(netInterface).forEach(function (key) {
      // Не учитываем псевдо интерфейс
      if (key.indexOf(PSEUDO_INTERFACE_KEY) === -1) {

        if (netInterface[key][0]['family'] === 'IPv4') {
          element = netInterface[key][0][elementKey];
        }
        else {
          element = netInterface[key][1][elementKey];
        }
      }
    });

    return element;
  },

  // Функция для получения широковещательного адреса
  getBroadcastAddress: function () {
    let ipAddress = this.getInterfaceElement('address');
    if (ipAddress === undefined) {
      throw new Error('Unable to find IP address');
    }

    let netMask = this.getInterfaceElement('netmask');
    if (ipAddress === undefined) {
      throw new Error('Unable to find netmask');
    }

    ipAddress = this.ipToNum(ipAddress);
    netMask = this.ipToNum(netMask);

    let broadcastAddress = Buffer.allocUnsafe(IPV4_SIZE);

    for (let i = 0; i < IPV4_SIZE; i++) {
      netMask[i] = ~netMask[i];
      broadcastAddress[i] = (ipAddress[i] | netMask[i]).toString();
    }
    broadcastAddress = this.ipToStr(broadcastAddress);

    return broadcastAddress;
  },

  // Функция для перевода строки с ip в численный буфер
  ipToNum: function (ipStr) {
    let ipNum = Buffer.allocUnsafe(IPV4_SIZE);

    ipStr = ipStr.split('.');

    for (let i = 0; i < IPV4_SIZE; i++) {
      ipNum[i] = parseInt(ipStr[i]);
    }

    return ipNum;
  },

  // Функция для перевода численного буфера с ip в строку
  ipToStr: function (ipNum) {
    let ipStr = '';

    for (let i = 0; i < IPV4_SIZE; i++) {
      ipStr += ipNum[i].toString();
      ipStr += '.';
    }
    // Удаляем последнюю точку
    ipStr = ipStr.substring(0, ipStr.length - 1);

    return ipStr;
  }
};