import { FileStore } from "./file_store";
import { IdbStore, StoreConfig } from "./idb_store";
import { debugMode } from "./log";
import { LogsStore } from "./store";
import { formatTime } from "./utils";

export enum LogLevel {
  Critical = "Critical",
  Error = "Error",
  Warn = "Warn",
  Info = "Info",
  Debug = "Debug",
}

export interface TagConfigs {
  color: string;
  backgroundColor: string;
}

export type Configs = {
  showTime: boolean;
  withStyles: boolean;
  showLevelLabel: boolean;
  persist: boolean;
  debug: boolean;
  styles: {
    [key in LogLevel]: TagConfigs;
  };
  maxFileSize?: number;
} & Partial<StoreConfig>;

const defaultConfigs: Configs = {
  showTime: true,
  showLevelLabel: true,
  withStyles: true,
  persist: false,
  debug: false,
  styles: {
    Critical: {
      color: "white",
      backgroundColor: "#7f0000",
    },
    Error: {
      backgroundColor: "#b71c1c",
      color: "white",
    },
    Warn: {
      backgroundColor: "#fdd835",
      color: "black",
    },
    Info: {
      backgroundColor: "#2e7d32",
      color: "white",
    },
    Debug: {
      backgroundColor: "#3d5afe",
      color: "white",
    },
  },
};

const LOG_LEVELS: LogLevel[] = [
  LogLevel.Debug,
  LogLevel.Info,
  LogLevel.Warn,
  LogLevel.Error,
  LogLevel.Critical,
];

const canLog = (tag: LogLevel, loglevel: LogLevel): boolean => {
  return LOG_LEVELS.indexOf(tag) >= LOG_LEVELS.indexOf(loglevel);
};

export type LogCallback = (time: string, level: LogLevel, tag: string, ...args: any[]) => void;

export class Gol {
  private configs: Configs;
  private readonly defaultStyle = "padding: 2px 4px;";
  private db?: LogsStore;
  public disable = false;

  constructor(
    public loglevel: LogLevel = LogLevel.Debug,
    configs?: Partial<Configs>,
    private callback?: LogCallback
  ) {
    this.loglevel = loglevel;
    this.configs = Object.assign(defaultConfigs, configs);
    debugMode.value = this.configs.debug;

    if (configs?.persist) {
      if ("storage" in navigator && "getDirectory" in navigator.storage) {
        this.db = new FileStore();
      } else {
        this.db = new IdbStore("gol", {
          expireTime: this.configs.expireTime,
          maxCount: this.configs.maxCount,
        });
      }
      this.db.init();
    }
  }

  private log = (loglevel: LogLevel, tag: string, tagConfigs: TagConfigs, args: any[]) => {
    if (!this.disable && canLog(loglevel, this.loglevel)) {
      const date = new Date();
      const time = this.formatTime(date);
      if (this.configs.withStyles) {
        console.log(
          `${time} %c${this.configs.showLevelLabel ? loglevel : " "}: %c${tag}`,
          this.getLogLevelStyles(tagConfigs),
          this.getTagStyles(tagConfigs),
          ...args
        );
      } else {
        console.log(`${time} [${this.configs.showLevelLabel ? loglevel : " "}: ${tag}]`, ...args);
      }
      this.db?.save(date.getTime(), tag, loglevel, args);
      this.callback?.(time, loglevel, tag, ...args);
    }
  };

  private formatTime(date: Date) {
    return this.configs.showTime ? formatTime(date) : "";
  }

  private getLogLevelStyles(tagConfigs: TagConfigs) {
    return `background-color: ${tagConfigs.backgroundColor};
    color: ${tagConfigs.color};
    font-weight: bold;
    ${this.defaultStyle}
   `;
  }

  private getTagStyles(tagConfigs: TagConfigs) {
    return `background-color: ${tagConfigs.backgroundColor}55;
    color: black;
    font-weight: normal;
    ${this.defaultStyle}
   `;
  }

  public getLogger(tag: string): Logger {
    return new Logger(tag, this);
  }

  public changeLevel(level: LogLevel) {
    this.loglevel = level;
  }

  critical = (tag: string, ...args: any[]) => {
    this.log(LogLevel.Critical, tag, this.configs.styles.Critical, args);
  };

  error = (tag: string, ...args: any[]) => {
    this.log(LogLevel.Error, tag, this.configs.styles.Error, args);
  };

  warn = (tag: string, ...args: any[]) => {
    this.log(LogLevel.Warn, tag, this.configs.styles.Warn, args);
  };

  info = (tag: string, ...args: any[]) => {
    this.log(LogLevel.Info, tag, this.configs.styles.Info, args);
  };

  debug = (tag: string, ...args: any[]) => {
    this.log(LogLevel.Debug, tag, this.configs.styles.Debug, args);
  };

  report = () => {
    return this.db?.report();
  };

  clean = () => {
    return this.db?.clean();
  };
}

export class Logger {
  constructor(private tag: string, private gol: Gol) {}

  critical = (...args: any[]) => {
    this.gol.critical(this.tag, ...args);
  };

  error = (...args: any[]) => {
    this.gol.error(this.tag, ...args);
  };

  warn = (...args: any[]) => {
    this.gol.warn(this.tag, ...args);
  };

  info = (...args: any[]) => {
    this.gol.info(this.tag, ...args);
  };

  debug = (...args: any[]) => {
    this.gol.debug(this.tag, ...args);
  };
}
