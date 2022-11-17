/** Core proof of concept application which connects to a serial device over BLE to transmit and receive data
Implements a walking exercise which interacts with the hardware device
*/
import React, {useState} from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Touchable,
  TouchableOpacity,
  View,
} from 'react-native';
import base64 from 'react-native-base64';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
import Sound from 'react-native-sound';
import DeviceModal from './deviceConnectionModal';
import useBLE from './useBLE';

const App = () => {
  const {
    requestPermissions,
    scanForDevices,
    allDevices,
    connectToDevice,
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
    disconnectFromDevice,
  } = useBLE();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [dataToSend, changeValueToSend] = useState<string>("");
  const [totalTime, setTotalTime] = useState<number>(60);
  const [exerciseState, setExerciseState] = useState<boolean>(false);
  const [key, setKey] = useState<number>(0);
  const [timer, setTimer] = useState<number>();

  //Helper function which finds local BLE devices
  const scanForPeripherals = () => {
    requestPermissions(isGranted => {
      if (isGranted) {
        scanForDevices();
      }
    });
  };

  //Helper function to hide modal once device has been connected
  const hideModal = () => {
    setIsModalVisible(false);
  };

  //Helper function to show modal if no device is currently connected
  const openModal = async () => {
    scanForPeripherals();
    setIsModalVisible(true);
  };
  
  //Helper function to set the stimulation strength setting of the exercise
  const changeSimulationStrength = (strength: number) => {
    if (strength <= 100) {
      setStimulationStrength(strength);
    } else {
      Alert.alert('Strength must be less than or equal to 100');
    }
  }
  
  //Helper function to change the settings values into the required string format
  const createSettingsString = (iD:number, sT: number, rT: number, sS: number) => {
    const fin = String(iD) + " " + String(sT) + " " + String(rT) + " " + String(sS) + ".";
    return fin;
  }
  
  //Helper function to load the metronome ticking sound
  const tick = new Sound('tick.mp3', Sound.MAIN_BUNDLE, (error: any) => {
    if (error) {
      console.log('failed to load the sound', error);
      return;
    }
    console.log('Sound was loaded');
  })
  
  //Helper function to play the loaded metronome sound
  const playTick = () => {
    tick.play();
  }
  
  //Function to control the exercise
  const handleExercise = () => {
    if (connectedDevice != null) {
      if (exerciseState) { //Sends S. when exercise is paused, pauses timer and stops playing the sound
        sendData(connectedDevice, base64.encode("s."));
        setExerciseState(false);
        if (timer != null) clearInterval(timer);
      } else { //Sends P. when exercise is started, starts timer and starts playing the sound
        sendData(connectedDevice, base64.encode("p."));
        setExerciseState(true);
        var newTimer = setInterval(playTick, restTime);
        setTimer(newTimer);
      } 
    } else {
      console.log('Device is not connected');
    }
  }
 
  return (
    <SafeAreaView style={styles.container}>
    <ScrollView>
      <View style={styles.appWrapper}>
        {connectedDevice ? (
          <>
            <Text style = {styles.titleText}>Walking Exercise PoC</Text>
            <View style = {styles.settingRows}>
              <View style = {styles.settingDivs}>
                <Text style={styles.settingText}>Current initial delay(ms):</Text>
                <TextInput style = {styles.settingInput} keyboardType = 'numeric' onChangeText = {text => setInitialDelay(+text)} value = {String(initialDelay)} />
              </View>
              <View style = {styles.settingDivs}>
              <Text style={styles.settingText}>Current stimulation time(ms):</Text>
              <TextInput style = {styles.settingInput} keyboardType = 'numeric' onChangeText = {text => setStimulationTime(+text)} value = {String(stimulationTime)} />
              </View>
              <View style = {styles.settingDivs}>
              <Text style={styles.settingText}>Current rest time(ms):</Text>
              <TextInput style = {styles.settingInput} keyboardType = 'numeric' onChangeText = {text => setRestTime(+text)} value = {String(restTime)} />
              </View>
              <View style = {styles.settingDivs}>
              <Text style={styles.settingText}>Current stimulation strength(%):</Text>
              <TextInput style = {styles.settingInput} keyboardType = 'numeric' maxLength = {3} onChangeText = {text => changeSimulationStrength(+text)} value = {String(stimulationStrength)} />
              </View>
            </View>
            <TouchableOpacity style = {styles.buttonStyle} disabled = {exerciseState} onPress = {() => sendData(connectedDevice, base64.encode(createSettingsString(initialDelay, stimulationTime, restTime, stimulationStrength)))}>
            <Text style = {styles.buttonText}>
              {'Update Setings'}
            </Text>
            </TouchableOpacity>
            <Text style = {styles.titleText}>
              {exerciseState? 'Please set total time while exercise is not running' : 'Set exercise time'}
            </Text>
            <TextInput style = {styles.input} keyboardType = 'numeric' editable = {!exerciseState} onChangeText = {text => setTotalTime(+text)} value = {String(totalTime)} />
            <TouchableOpacity disabled = {exerciseState} onPress = {() => setKey(prevKey => prevKey + 1)} style = {styles.buttonStyle}>
            <Text style = {styles.buttonText}>
              {exerciseState? 'Pause exercise to reset timer' : 'Reset timer'}
            </Text>
            </TouchableOpacity>
            <Text style={styles.titleText}>Walking Exercise Timer</Text>
            <CountdownCircleTimer isPlaying={exerciseState} colors={['#004777', '#F7B801', '#A30000', '#A30000']} colorsTime = {[60, 45, 30, 15]} key = {key} duration = {totalTime} onComplete = {() => {handleExercise(); setKey(prevKey => prevKey + 1)}}>
            {({ remainingTime }) => <Text>{remainingTime} seconds</Text>}
            </CountdownCircleTimer>
            <TouchableOpacity onPress = {handleExercise} style = {styles.buttonStyle}>
            <Text style = {styles.buttonText}>
              {exerciseState? 'Pause Exercise' : 'Start Exercise'}
            </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.titleText}>
            Please Connect to a bluetooth device
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={connectedDevice ? disconnectFromDevice : openModal}
        style={styles.buttonStyle}>
        <Text style={styles.buttonText}>
          {connectedDevice ? 'Disconnect' : 'Connect to bluetooth device'}
        </Text>
      </TouchableOpacity>
      <DeviceModal
        closeModal={hideModal}
        visible={isModalVisible}
        connectToPeripheral={connectToDevice}
        devices={allDevices}
      />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingTop: StatusBar.currentHeight,
  },
  appWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    color: 'black',
  },
  settingText: {
    fontSize: 14,
    marginTop: 15,
    marginLeft: 15
  },
  buttonStyle: {
    backgroundColor: 'powderblue',
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
    padding: 15
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  settingInput: {
    height: 40,
    width: '80%',
    margin: 12,
    borderWidth: 1,
    padding: 10,
    textAlign: 'center'
  },
  input: {
    height: 40,
    width: '50%',
    margin: 12,
    borderWidth: 1,
    padding: 10,
    textAlign: 'center'
  },
  settingRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  }, 
  settingDivs: {
    width: '50%',
    height: '40%',
    alignItems: 'center'
  }
});

export default App;