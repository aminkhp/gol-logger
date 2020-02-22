type LogLevel = "Critical" | "Error" | "Warn" | "Info" | "Debug";

interface TagConfigs {
  color: string;
  backgroundColor: string;
  symbol: string;
}

interface Configs {
  useNative: boolean;
  withSymbols: boolean;
  criticalColorStyles: TagConfigs;
  errorColorStyles: TagConfigs;
  warnColorStyles: TagConfigs;
  infoColorStyles: TagConfigs;
  debugColorStyles: TagConfigs;
}

const defaultConfigs: Configs = {
  useNative: false,
  withSymbols: true,
  criticalColorStyles: {
    color: "white",
    backgroundColor: "#7f0000",
    symbol: "🚨"
  },
  errorColorStyles: {
    backgroundColor: "#b71c1c",
    color: "white",
    symbol: "❌"
  },
  warnColorStyles: {
    backgroundColor: "#fdd835",
    color: "black",
    symbol: "📢"
  },
  infoColorStyles: {
    backgroundColor: "#2e7d32",
    color: "white",
    symbol: "❕"
  },
  debugColorStyles: {
    backgroundColor: "#3d5afe",
    color: "white",
    symbol: "🔎"
  }
};

const loglevels: LogLevel[] = ["Debug", "Info", "Warn", "Error", "Critical"];

const canLog = (tag: LogLevel, loglevel: LogLevel): boolean => {
  return loglevels.indexOf(tag) >= loglevels.indexOf(loglevel);
};

class Gol {
  private currentLoglevel: LogLevel;
  private configs: Configs;
  private defaultStyle =
    "padding: 2px 4px;";

  constructor(loglevel: LogLevel, configs?: Partial<Configs>) {
    this.currentLoglevel = loglevel;
    this.configs = Object.assign(defaultConfigs, configs);
  }

  private logWithStyles(
    loglevel: LogLevel,
    tag: string,
    tagConfigs: TagConfigs,
    args: any[]
  ) {
    if (canLog(loglevel, this.currentLoglevel)) {
      console.log(
        `${this.configs.withSymbols ? tagConfigs.symbol : ''} %c${loglevel.toUpperCase()}%c${tag}`,
        `background-color: ${tagConfigs.backgroundColor};
         color: ${tagConfigs.color};
         font-weight: bold;
         ${this.defaultStyle}
        `,
        `background-color: ${tagConfigs.backgroundColor}55;
         color: black;
         font-weight: normal;
         ${this.defaultStyle}
        `,
        ...args
      );
    }
  }

  // log(loglevel: LogLevel, message: any) {}

  critical(tag: string, ...args: any[]) {
    const { criticalColorStyles } = this.configs;
    this.logWithStyles("Critical", tag, criticalColorStyles, args);
  }

  error(tag: string, ...args: any[]) {
    if (this.configs.useNative) {
      console.error(...args);
    } else {
      const { errorColorStyles } = this.configs;
      this.logWithStyles("Error", tag, errorColorStyles, args);
    }
  }

  warn(tag: string, ...args: any[]) {
    if (this.configs.useNative) {
      console.warn(...args);
    } else {
      const { warnColorStyles } = this.configs;
      this.logWithStyles("Warn", tag, warnColorStyles, args);
    }
  }

  info(tag: string, ...args: any[]) {
    const { infoColorStyles } = this.configs;
    this.logWithStyles("Info", tag, infoColorStyles, args);
  }

  debug(tag: string, ...args: any[]) {
    const { debugColorStyles } = this.configs;
    this.logWithStyles("Debug", tag, debugColorStyles, args);
  }
}

export default Gol;
