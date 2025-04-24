export class Logger {
  static log(message: string): void {
    console.log(message);
  }
  static error(message: string, error?: unknown): void {
    console.error(message, error ? error : '');
  }
  static warn(message: string): void {
    console.warn(message);
  }
  static info(message: string): void {
    console.info(message);
  }
} 