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

  return (
    <SafeAreaView style={styles.container}>
      <Button
        title="Start"
        onPress={() => {
          send({ type: 'start' })
        }}
        containerStyle={styles.button}
      />

      <Text h1 style={styles.counter}>
        {formatTime(state.context.duration)}
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
  },
  button: {
    width: 100,
  },
})
