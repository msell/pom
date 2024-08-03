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
  initial: 'stopped',
  context: {
    duration: DEFAULT_DURATION,
  },
  states: {
    stopped: {
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
        stop: 'stopped',
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
      target: '.stopped',
    },
  },
})
