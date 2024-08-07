import React, { useRef, useEffect } from 'react'
import { StyleSheet, View, SafeAreaView, Animated } from 'react-native'
import { Button, Text, Input } from '@rneui/themed'
import { stopwatchMachine } from '@/machines/stopwatch'
import { useMachine } from '@xstate/react'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

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
  const [state, send] = useMachine(stopwatchMachine)
  const animation = useRef(new Animated.Value(0)).current

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

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: false,
        }),
      ])
    ).start()
  }, [])

  const isBreak = state.value === 'break'

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: isBreak ? ['#FFD700', '#FFA500'] : ['#FF6347', '#FF4500'], // Gold to Orange for break, Tomato to OrangeRed for work
  })

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
    <Animated.View style={[styles.container, { backgroundColor }]}>
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
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
