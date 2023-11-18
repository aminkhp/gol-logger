import { LogLevel } from "./Gol";
import { FileStream, LogsPack } from "./file_stream";
import { debug } from "./log";
import { Log, LogsStore } from "./store";
import { formatLine, formatTime, getBaseFilename, getFilename, trueAssign } from "./utils";

const MB = 1e6;

export interface FileStoreOptions {
  maxFileSize: number;
  expireDay: number;
}
export class FileStore implements LogsStore {
  private logsDir?: FileSystemDirectoryHandle;
  private queue: Omit<Log, "id">[] = [];
  private log?: LogsPack;
  private options: FileStoreOptions;

  constructor(options?: Partial<FileStoreOptions>) {
    this.options = trueAssign({ maxFileSize: 10 * MB, expireDay: 2 }, options);
    debug("filestore", this.options);
  }

  private static instance: FileStore;
  public static getInstance(options?: Partial<FileStoreOptions>) {
    if (!FileStore.instance) {
      FileStore.instance = new FileStore(options);
    }

    return FileStore.instance;
  }

  async init(): Promise<void> {
    if (!navigator.storage || !("persist" in navigator.storage)) {
      throw new Error("Persist is not available.");
    }

    const persistent = await navigator.storage.persist();
    if (!persistent) {
      throw new Error("persistent not allowed!");
    }

    debug("presistance", persistent);
    const root = await navigator.storage.getDirectory();
    this.logsDir = await root.getDirectoryHandle("logs", { create: true });

    const today = new Date();
    const todayFilename = getBaseFilename(today);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFilename = getBaseFilename(yesterday);

    debug("init", todayFilename, yesterdayFilename);
    for await (const [name] of this.logsDir) {
      const file = await (await this.logsDir.getFileHandle(name)).getFile();
      debug("file", name, file.size);
      if (name.startsWith(todayFilename) || name.startsWith(yesterdayFilename)) continue;

      debug("remove entry", name);
      this.logsDir.removeEntry(name);
    }

    const pack = new LogsPack(this.logsDir, todayFilename, this.options.maxFileSize);
    await pack.create();

    debug("file store", this.queue);
    this.queue.forEach((log) => {
      pack.writeLine(formatLine(log.date, log.tag, log.level, log.args));
    });

    this.queue = [];
    this.log = pack;
  }

 

  async save(date: number, tag: string, level: LogLevel, args: unknown[]): Promise<void> {
    if (!this.log) {
      this.queue.push({ date, args, tag, level });
      return;
    }

    this.log.writeLine(formatLine(date, tag, level, args));
  }

  async report(): Promise<void | File[]> {
    if (!this.logsDir) return;

    const files = [];
    for await (const [name] of this.logsDir) {
      if (!name.endsWith(".log")) continue;

      const fileHandle = await this.logsDir.getFileHandle(name);
      const file = await fileHandle.getFile();
      files.push(file);
    }

    return files;
  }

  clean(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
