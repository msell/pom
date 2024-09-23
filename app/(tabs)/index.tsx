import React, { useRef, useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  SafeAreaView,
  Animated,
  AppState,
} from 'react-native'
import { Button, Text, Input } from '@rneui/themed'
import { stopwatchMachine } from '@/machines/stopwatch'
import { useMachine } from '@xstate/react'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

async function requestLocalNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    alert('Permission to send notifications was denied')
    return false
  }

  return true
}
const BACKGROUND_FETCH_TASK = 'background-fetch'
const TIMER_STORAGE_KEY = '@timer_state'

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const storedState = await AsyncStorage.getItem(TIMER_STORAGE_KEY)
  if (storedState) {
    const { value, context } = JSON.parse(storedState)
    if (value === 'running') {
      const newDuration = context.duration - 15 // Assume 15 seconds have passed
      if (newDuration <= 0) {
        // Timer expired
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Timer Expired!',
            body: 'Your Pomodoro session has ended.',
          },
          trigger: null,
        })
        await AsyncStorage.setItem(
          TIMER_STORAGE_KEY,
          JSON.stringify({
            value: 'complete',
            context: { ...context, duration: 0 },
          })
        )
      } else {
        // Update stored state
        await AsyncStorage.setItem(
          TIMER_STORAGE_KEY,
          JSON.stringify({
            value,
            context: { ...context, duration: newDuration },
          })
        )
      }
    }
  }
  return BackgroundFetch.BackgroundFetchResult.NewData
})

export default function HomeScreen() {
  const appState = useRef(AppState.currentState)
  const [appStateVisible, setAppStateVisible] = useState(appState.current)
  const [state, send] = useMachine(stopwatchMachine)

  useEffect(() => {
    requestLocalNotificationPermissions()
  }, [])

  useEffect(() => {
    if (state.value === 'complete' && appStateVisible === 'active') {
      alert('Pom complete')
    }
  })

  useEffect(() => {
    const remainingTime = state.context.duration
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!')

        Notifications.cancelAllScheduledNotificationsAsync()
      }

      console.log({
        current: appState.current,
        nextAppState,
        stateMachineState: state.value,
      })
      if (
        ['inactive', 'background'].includes(nextAppState) &&
        appState.current === 'active' &&
        state.value === 'running'
      ) {
        // schedule notification and write state to storage
        console.log(`scheduleing notifiation in ${remainingTime} seconds`)
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Time's up!",
            body: 'Pomodoro complete.',
          },
          trigger: {
            seconds: remainingTime,
          },
        }).then((notificationId) => {
          console.log(`notificationId ${notificationId}`)
        })
      }
      appState.current = nextAppState
      setAppStateVisible(appState.current)
      console.log('AppState', appState.current)
    })

    return () => {
      subscription.remove()
    }
  }, [state.value, state.context.duration])
  useEffect(() => {
    // Register background fetch task
    BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15, // 15 seconds
      stopOnTerminate: false,
      startOnBoot: true,
    })

    // Set up notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })

    // Load stored state
    const loadStoredState = async () => {
      const storedState = await AsyncStorage.getItem(TIMER_STORAGE_KEY)
      if (storedState) {
        const { value, context } = JSON.parse(storedState)
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - context.lastUpdated) / 1000)
        send({
          type: 'restore',
          context: context,
          elapsedSeconds: elapsedSeconds,
        })
      }
    }
    loadStoredState()

    // Clean up
    return () => {
      BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK)
    }
  }, [])

  useEffect(() => {
    // Store state changes
    AsyncStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({ value: state.value, context: state.context })
    )
  }, [state])

  const isBreak = state.value === 'break'

  const renderButtons = () => {
    let mainButtonTitle = 'Start'
    let mainButtonAction = () => send({ type: 'start' })

    if (state.value === 'running') {
      mainButtonTitle = 'Pause'
      mainButtonAction = () => send({ type: 'pause' })
    } else if (state.value === 'paused') {
      mainButtonTitle = 'Resume'
      mainButtonAction = () => send({ type: 'resume' })
    } else if (state.value === 'break') {
      mainButtonTitle = 'Skip Break'
      mainButtonAction = () => send({ type: 'skip' })
    }

    const showResetButton = !['idle', 'break'].includes(state.value as string)

    return (
      <View
        style={[
          styles.buttonContainer,
          !showResetButton && styles.singleButtonContainer,
        ]}
      >
        <Button
          title={mainButtonTitle}
          onPress={mainButtonAction}
          buttonStyle={styles.buttonStyle}
          containerStyle={styles.buttonInnerContainer}
        />
        {showResetButton && (
          <Button
            title="Reset"
            onPress={() => send({ type: 'reset' })}
            buttonStyle={styles.buttonStyle}
            containerStyle={styles.buttonInnerContainer}
          />
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container]}>
      <SafeAreaView style={styles.safeView}>
        <Input
          placeholder="What are you focused on?"
          inputStyle={{ color: 'white' }}
          placeholderTextColor="white"
          inputContainerStyle={{
            borderBottomColor: 'white',
            marginTop: 100,
          }}
        />
        <View style={styles.content}>
          <Text style={styles.counter}>
            {formatTime(state.context.duration)}
          </Text>
          <Text style={styles.stateText}>
            {isBreak ? 'Break Time!' : (state.value as string)}
          </Text>
          {/* <Text style={styles.pomodoroCount}>
            Completed Pomodoros: {state.context.completedPomodoros}
          </Text> */}
          {renderButtons()}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6347',
  },
  safeView: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontSize: 72,
    color: 'white',
    fontWeight: 'bold',
  },
  stateText: {
    marginTop: 20,
    color: 'white',
    fontSize: 24,
  },
  pomodoroCount: {
    marginTop: 10,
    color: 'white',
    fontSize: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    width: '100%',
  },
  singleButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInnerContainer: {
    width: 150,
    marginHorizontal: 10,
  },
  buttonStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    paddingVertical: 15,
  },
})
