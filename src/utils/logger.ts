export const LogLevel = {
  INFO: 'INFO',
  WARNING: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

class Logger {
  private log(level: LogLevel, message: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString()
    const formattedMessage = `[${timestamp}] [${level}] ${message}`

    switch (level) {
      case LogLevel.INFO:
        console.info(formattedMessage, ...optionalParams)
        break
      case LogLevel.WARNING:
        console.warn(formattedMessage, ...optionalParams)
        break
      case LogLevel.ERROR:
        console.error(formattedMessage, ...optionalParams)
        break
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...optionalParams)
        break
    }
  }

  info(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.INFO, message, ...optionalParams)
  }

  warn(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.WARNING, message, ...optionalParams)
  }

  error(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.ERROR, message, ...optionalParams)
  }

  debug(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.DEBUG, message, ...optionalParams)
  }
}

export const logger = new Logger()
