import { assign, fromCallback, setup } from 'xstate'

const DEFAULT_DURATION = 25 * 60

export const stopwatchMachine = setup({
  actors: {
    ticks: fromCallback(({ sendBack }) => {
      const interval = setInterval(() => {
        sendBack({ type: 'TICK' })
      }, 1000)
      return () => clearInterval(interval)
    }),
  },
}).createMachine({
  id: 'stopwatch',
  initial: 'idle',
  context: {
    duration: DEFAULT_DURATION,
  },
  states: {
    idle: {
      on: {
        start: 'running',
      },
    },
    running: {
      invoke: {
        src: 'ticks',
      },
      on: {
        TICK: [
          {
            guard: ({ context }) => context.duration <= 1,
            target: 'complete',
            actions: assign({
              duration: 0,
            }),
          },
          {
            actions: assign({
              duration: ({ context }) => context.duration - 1,
            }),
          },
        ],
        pause: 'paused',
        stop: 'idle',
      },
    },
    paused: {
      on: {
        resume: 'running',
        stop: 'idle',
      },
    },
    complete: {
      type: 'final',
    },
  },
  on: {
    reset: {
      actions: assign({
        duration: DEFAULT_DURATION,
      }),
      target: '.idle',
    },
  },
})
