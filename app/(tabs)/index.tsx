import React from 'react'
import { StyleSheet, View, SafeAreaView } from 'react-native'
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

  const renderActionButton = () => {
    switch (state.value) {
      case 'idle':
        return (
          <Button
            title="Start"
            onPress={() => send({ type: 'start' })}
            containerStyle={styles.button}
          />
        )
      case 'running':
        return (
          <Button
            title="Pause"
            onPress={() => send({ type: 'pause' })}
            containerStyle={styles.button}
          />
        )
      case 'paused':
        return (
          <Button
            title="Resume"
            onPress={() => send({ type: 'resume' })}
            containerStyle={styles.button}
          />
        )
      default:
        return null
    }
  }

  return (
    <SafeAreaView style={styles.safeView}>
      <View style={styles.container}>
        <Text h1 style={styles.counter}>
          {formatTime(state.context.duration)}
        </Text>
        <Text h3 style={styles.stateText}>
          {state.value as string}
        </Text>

        <View style={styles.buttonContainer}>
          {renderActionButton()}
          {state.value !== 'idle' && (
            <Button
              title="Reset"
              onPress={() => send({ type: 'reset' })}
              containerStyle={styles.button}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeView: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    paddingTop: 100,
  },
  counter: {
    marginTop: 100,
    textAlign: 'center',
    fontSize: 48,
  },
  stateText: {
    marginTop: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  button: {
    width: 100,
    marginHorizontal: 10,
  },
})
