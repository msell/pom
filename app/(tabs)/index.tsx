import React, { useRef, useEffect } from 'react'
import { StyleSheet, View, SafeAreaView, Animated } from 'react-native'
import { Button, Text } from '@rneui/themed'
import { stopwatchMachine } from '@/machines/stopwatch'
import { useMachine } from '@xstate/react'

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

export default function HomeScreen() {
  const [state, send] = useMachine(stopwatchMachine)
  const animation = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 2000,
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
