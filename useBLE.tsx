/** Helper class to assist with all Bluetooth connection and functionality*/
import { Dispatch, SetStateAction, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native"
import base64 from "react-native-base64";
import { Base64, BleError, BleManager, Characteristic, Device } from "react-native-ble-plx";

type PermissionCallback = (result:boolean) => void

const bleManager = new BleManager();

//Constants for service IDs - Can be changed depending on hardware device
const MICROCONTROLLER_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const MICROCONTROLLER_RX = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const MICROCONTROLLER_TX = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; 

interface BluetoothLowEnergyApi {
  requestPermissions(callback: PermissionCallback): Promise<void>;
  connectToDevice(device:Device): Promise<void>;
  disconnectFromDevice: () => void;
  scanForDevices(): void;
  connectedDevice: Device|null;
  initialDelay: number;
  stimulationTime: number;
  restTime: number;
  stimulationStrength: number;
  setInitialDelay: Dispatch<SetStateAction<number>>;
  setStimulationTime: Dispatch<SetStateAction<number>>;
  setRestTime: Dispatch<SetStateAction<number>>;
  setStimulationStrength: Dispatch<SetStateAction<number>>;
  sendData(device: Device, message:Base64): Promise<void>;
  allDevices: Device[];
}

export default function useBLE(): BluetoothLowEnergyApi {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [initialDelay, setInitialDelay] = useState<number>(0);
  const [stimulationTime, setStimulationTime] = useState<number>(250);
  const [restTime, setRestTime] = useState<number>(750);
  const [stimulationStrength, setStimulationStrength] = useState<number>(100);

  //Permissions must be requested to enable bluetooth connection
  const requestPermissions = async(callback: PermissionCallback) => {
    if (Platform.OS === 'android') {
      const grantedStatus = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "Bluetooth Low Energy Needs Location Permission",
          buttonNegative: "Cancel",
          buttonPositive: "Agree",
        }
      );
      callback(grantedStatus === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      callback(true);
    }
  };
  
  //Helper function to check if bluetooth device has already been discovered
  const isDuplicate = (devices:Device[], nextDevice: Device) => 
    devices.findIndex(device => nextDevice.id === device.id) > -1;
  
  //Helper function scan for nearby bluetooth devices
  const scanForDevices = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }
      if (device && device.name?.includes('UART')) {
        setAllDevices((prevState) => {
          if (!isDuplicate(prevState, device)) {
            return[...prevState, device];
          }
          return prevState;
        })
      }
    })
  }
  
  //Helper function to connect to a discovered bluetooth device
  const connectToDevice = async(device:Device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);
      await deviceConnection.discoverAllServicesAndCharacteristics();
      bleManager.stopDeviceScan();
      streamData(deviceConnection);
    } catch (e) {
      console.log("Error when connecting to device", e);
    }
  };
  
  //Helper function to disconnect the currently connected device
  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
    }
  };
  
  //Helper function that adds a listener to a service - collects all data sent by bluetooth device
  const streamData = async(device:Device) => {
    if (device) {
      device.monitorCharacteristicForService(MICROCONTROLLER_UUID, MICROCONTROLLER_TX, (error, characteristic) => onDataUpdate(error, characteristic),);
    } else {
      console.log("No device connected");
    }
  };
  
  //Helper function to send data to the connected bluetooth device
  const sendData = async(device:Device, message: Base64) => {
    if (device) {
      device.writeCharacteristicWithoutResponseForService(MICROCONTROLLER_UUID, MICROCONTROLLER_RX, message)
    } else {
      console.log("No device connected");
    }
  }
  
  //Helper function which extracts required data from sent settings string and updates exercise setting values accordingly 
  const onDataUpdate = (
  error: BleError | null, 
  characteristic: Characteristic | null
  ) => {
    if (error) {
      console.error(error);
      return -1;
    } else if (!characteristic?.value) {
      console.error("No data was received");
      return -1;
    } 
    var ret = base64.decode(characteristic.value).trim();
    if (ret.slice(-1) != '.') {
      console.log('Bad request received ' + ret);
      return -1;
    } 
    ret = ret.slice(0, -1);
    var values = ret.split(' ');
    if (values.length != 4) {
      console.log('Request missing values ' + ret);
      return -1;
    }
    setInitialDelay(+values[0]);
    setStimulationTime(+values[1]);
    setRestTime(+values[2]);
    setStimulationStrength(+values[3]);
  } 
  
  return {
    requestPermissions,
    connectToDevice,
    disconnectFromDevice,
    scanForDevices,
    connectedDevice,
    initialDelay,
    stimulationTime,
    restTime,
    stimulationStrength,
    setInitialDelay,
    setStimulationTime,
    setRestTime,
    setStimulationStrength,
    sendData,
    allDevices,
  }
}