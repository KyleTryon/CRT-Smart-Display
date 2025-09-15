import config from '../config/config.json'

// Global Display Configuration
export const DISPLAY_CONFIG = {
  APP_CYCLE_TIME: config.display.appCycleTime,
  CLOCK_UPDATE_INTERVAL: config.display.clockUpdateInterval,
  STATIC_APP: config.display.staticApp,
  ENABLE_CYCLING: config.display.enableCycling,
} as const
