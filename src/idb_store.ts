import { DBSchema, IDBPDatabase, IDBPTransaction, openDB } from "idb/with-async-ittr";
import { LogLevel } from "./Gol";
import { Log, LogsStore } from "./store";
import { formatLine, getFilename, trueAssign } from "./utils";
import { debug } from "./log";

type Stores = ["logs", "metadata"];
type DbTransaction<Mode extends IDBTransactionMode = "readonly"> = IDBPTransaction<
  LogsDb,
  Stores,
  Mode
>;
interface Upgrade {
  version: number;
  upgrade(db: IDBPDatabase<LogsDb>, transaction: DbTransaction<"versionchange">): void;
}

interface Metadata {
  index: number;
}

const upgrades: Upgrade[] = [
  {
    version: 1,
    upgrade(db) {
      const logs = db.createObjectStore("logs", { keyPath: "id" });
      logs.createIndex("date", "date");

      db.createObjectStore("metadata");
    },
  },
];

const Day1 = 24 * 60 * 60 * 1000;

interface LogsDb extends DBSchema {
  metadata: {
    key: keyof Metadata;
    value: number | string;
  };
  logs: {
    value: Log;
    key: string;
    indexes: { date: number; tag: string; level: string };
  };
}

export interface StoreConfig {
  maxCount: number;
  expireTime: number;
}

export class IdbStore implements LogsStore {
  private idb!: IDBPDatabase<LogsDb>;
  private index!: number;
  private queue: Pick<Log, "date" | "tag" | "level" | "args">[] = [];
  private inited = false;
  private cleaning: boolean = false;
  private config: StoreConfig;
  private state: "open" | "closed" | "unknown" = "unknown";

  constructor(private name: string, options?: Partial<StoreConfig>) {
    this.config = trueAssign(
      {
        maxCount: 10_000,
        expireTime: Day1 / 2,
      },
      options
    );
  }

  private static instance: IdbStore;

  public static getInstance(name: string, options?: Partial<StoreConfig>) {
    if (!IdbStore.instance) {
      IdbStore.instance = new IdbStore(name, options);
    }

    return IdbStore.instance;
  }

  private async openDbIfNeeded() {
    
    if(this.state !== "open") {
      this.idb = await openDB(this.name, 1);
      this.state = "open";
    }
  }

  async init() {
    this.idb = await openDB<LogsDb>(this.name, 1, {
      upgrade(database, oldVersion, newVersion, transaction, event) {
        for (const task of upgrades) {
          if (task.version > oldVersion) {
            task.upgrade(database, transaction);
          }
        }
      },
      terminated: () => {
        this.state = "closed";
      },
    });

    this.state = "open";

    const transaction = this.createTransaction("readwrite");
    const metadata = transaction.objectStore("metadata");
    const logs = transaction.objectStore("logs");
    this.index = ((await metadata.get("index")) as number) ?? 0;

    await this.removeOldLogsByDate(transaction as DbTransaction<"readwrite">);
    await this.removeOldLogsByCount(transaction as DbTransaction<"readwrite">);

    this.inited = true;
    const count = await logs.count();
    debug("count after delete", count);
    await this.checkQueue(transaction as DbTransaction<"readwrite">);

    await transaction.done;

    // this.scheduleCleaner();
  }

  private scheduleCleaner() {
    // TODO: when to clearTimeout
    setInterval(() => {
      const transaction = this.createTransaction("readwrite");
      this.removeOldLogsByCount(transaction as DbTransaction<"readwrite">);
    }, 60_000);
  }

  private createTransaction(mode: IDBTransactionMode = "readonly") {
    return this.idb!.transaction(["logs", "metadata"], mode);
  }

  private async removeOldLogsByDate(transaction: DbTransaction<"readwrite">) {
    const logs = transaction!.objectStore("logs");
    const byDate = logs.index("date");

    const expireDate = Date.now() - this.config.expireTime;
    const logsIt = byDate.iterate(IDBKeyRange.upperBound(expireDate), "prev");

    let deletes = 0;
    for await (const _log of logsIt) {
      _log.delete?.();
      deletes++;
    }

    debug("removeOldLogsByDate", { from: expireDate, deletes });
  }

  private async removeOldLogsByCount(transaction: DbTransaction<"readwrite">) {
    const logs = transaction!.objectStore("logs");
    const count = await logs.count();
    if (count < this.config.maxCount) return;

    this.cleaning = true;

    const byDate = logs.index("date");
    const logIt = byDate.iterate(IDBKeyRange.lowerBound(0), "next");

    let deleteSize = count - this.config.maxCount;
    let deletes = deleteSize;

    for await (const _log of logIt) {
      if (deletes === 0) break;
      _log.delete();
      deletes--;
    }

    debug("removeOldLogsByCount", { deleteSize });
    this.cleaning = false;
  }

  private async checkQueue(transaction: DbTransaction<"readwrite">) {
    debug("queue", this.queue);

    if (this.queue.length === 0) return;

    const logs = transaction.objectStore("logs");
    const metadata = transaction.objectStore("metadata");

    try {
      for (const log of this.queue) {
        this.index++;
        const id = `${this.index}-${log.date}`;
        logs.put(Object.assign(log, { id }));
      }
      metadata.put(this.index, "index");
      await transaction.done;
    } catch (error) {}
    this.queue = [];
  }

  async save(date: number, tag: string, level: LogLevel, args: unknown[]) {
    if (!this.inited || this.cleaning) {
      debug("push to queue", date, tag, level, args);
      this.queue.push({ date, tag, level, args });
      return;
    }

    this.index++;
    const id = `${this.index}-${date}`;
    const _log: Log = { id, date, tag, level, args };

    const transaction = this.createTransaction("readwrite");
    const logs = transaction.objectStore("logs");
    const metadata = transaction.objectStore("metadata");
    try {
      logs.put?.(_log);
      metadata.put?.(this.index, "index");
      await transaction.done;
    } catch (error) {}
  }

  // options: { from?: number; to?: number; count?: number }
  async report() {
    if (!this.idb) return Promise.resolve();

    const transaction = this.createTransaction("readonly");
    const logs = transaction!.objectStore("logs");

    const byDate = logs.index("date");
    const logIt = byDate.iterate(IDBKeyRange.lowerBound(0), "next");

    let data = ""; // if you want json JSON.stringify(logs)
    for await (const _log of logIt) {
      const value = _log.value;
      if (!value) continue;

      data += formatLine(value.date, value.tag, value.level, value.args);
    }

    const file = new File([data], getFilename(new Date(), 0), {
      type: "text/plain",
    });

    return [file];
  }

  clean() {
    const transaction = this.createTransaction("readwrite");
    return this.removeOldLogsByCount(transaction as DbTransaction<"readwrite">);
  }
}
