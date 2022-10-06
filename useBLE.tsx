import { useState } from "react";
import { PermissionsAndroid, Platform } from "react-native"
import { BleError, BleManager, Characteristic, Device } from "react-native-ble-plx";

type PermissionCallback = (result:boolean) => void

const bleManager = new BleManager();

const MICROCONTROLLER_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const MICROCONTROLLER_RX = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; 
const MICROCONTROLLER_TX = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; 

interface BluetoothLowEnergyApi {
  requestPermissions(callback: PermissionCallback): Promise<void>;
  connectToDevice(device:Device): Promise<void>;
  disconnectFromDevice: () => void;
  scanForDevices(): void;
  connectedDevice: Device|null;
  receivedData: number;
  allDevices: Device[];
}

export default function useBLE(): BluetoothLowEnergyApi {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [receivedData, setReceivedData] = useState<number>(0);

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
  
  const isDuplicate = (devices:Device[], nextDevice: Device) => 
    devices.findIndex(device => nextDevice.id === device.id) > -1;
  
  const scanForDevices = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }
      if (device && device.name?.includes('nrf')) {
        setAllDevices((prevState) => {
          if (!isDuplicate(prevState, device)) {
            return[...prevState, device];
          }
          return prevState;
        })
      }
    })
  }
  
  const connectToDevice = async(device:Device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);
      bleManager.stopDeviceScan();
      await deviceConnection.discoverAllServicesAndCharacteristics();
      streamData(device);
    } catch (e) {
      console.log("Error when connecting to device", e);
    }
  };
  
  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      setReceivedData(0);
    }
  };
  
  const streamData = async(device:Device) => {
    if (device) {
      device.monitorCharacteristicForService(MICROCONTROLLER_UUID, MICROCONTROLLER_RX, () => {});
    } else {
      console.log("No device connected");
    }
  };
  
  const onDataUpdate = (
  error: BleError | null, 
  characteristic: Characteristic | null
  ) => {
    if (error) {
      console.error(error);
      return;
    } else if (!characteristic?.value) {
      console.error("No Characteristic Found");
    }
  } 
  
  return {
    requestPermissions,
    connectToDevice,
    disconnectFromDevice,
    scanForDevices,
    connectedDevice,
    receivedData,
    allDevices,
  }
}