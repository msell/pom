import { assign, fromCallback, setup } from 'xstate'

const DEFAULT_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60

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
  id: 'pomodoro',
  initial: 'idle',
  context: {
    duration: DEFAULT_DURATION,
    completedPomodoros: 0,
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
        resume: {
          target: 'running',
          actions: assign({ lastUpdated: () => Date.now() }),
        },
        stop: {
          target: 'idle',
          actions: assign({ lastUpdated: () => Date.now() }),
        },
      },
    },
    complete: {
      entry: assign({
        completedPomodoros: ({ context }) => context.completedPomodoros + 1,
      }),
      after: {
        0: 'break',
      },
    },
    break: {
      entry: assign({
        duration: BREAK_DURATION,
      }),
      invoke: {
        src: 'ticks',
      },
      on: {
        TICK: [
          {
            guard: ({ context }) => context.duration <= 1,
            target: 'idle',
            actions: [
              assign({
                duration: DEFAULT_DURATION,
                lastUpdated: () => Date.now(),
              }),
            ],
          },
          {
            actions: assign({
              duration: ({ context }) => context.duration - 1,
              lastUpdated: Date.now(),
            }),
          },
        ],
        skip: 'idle',
      },
    },
  },
  on: {
    reset: {
      actions: assign({
        duration: DEFAULT_DURATION,
        completedPomodoros: 0,
        lastUpdated: () => Date.now(),
      }),
      restore: {
        actions: assign((_, event: any) => ({
          duration: event.context.duration,
          completedPomodoros: event.context.completedPomodoros,
          lastUpdated: Date.now(),
        })),
        target: '.idle',
      },
    },
  },
})
