import { StopwatchContext } from '@/machines/stopwatch'

export interface StorageType {
  scheduledNotificationId?: string
  context: StopwatchContext
}
