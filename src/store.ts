import { LogLevel } from "./Gol";

export interface Log {
  id: string;
  date: number;
  tag: string;
  level: LogLevel;
  args: unknown[];
}

export interface LogsStore {
  init(): Promise<void>;
  save(
    date: number,
    tag: string,
    level: LogLevel,
    args: unknown[]
  ): Promise<void>;
  report(): Promise<File[] | void>;
  clean(): Promise<void>;
}