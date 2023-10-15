import { debug } from "./log";
import { getFilename } from "./utils";

const fileNameRegex = /([\d-]+)\((\d+)\)\.log/;

export class FileStream {
  private queue: string[] = [];
  private isOpen = false;
  private currentStream?: FileSystemWritableFileStream;
  private bufferCount = 0;
  public onFileChange?: (file: File) => void;
  private flushIntervalId?: number;

  constructor(public fileHandle: FileSystemFileHandle, debug?: boolean) {
    this.flush = this.flush.bind(this);
  }

  public async flush() {
    debug(">>>flush", this.bufferCount);
    if (this.bufferCount === 0) return;
    this.isOpen = false;
    await this.currentStream!.close();
    const file = await this.fileHandle.getFile();
    this.currentStream = await this.fileHandle.createWritable({
      keepExistingData: true,
    });

    this.onFileChange?.(file);
    await this.currentStream.seek(file.size);
    debug(">>>flush", this.queue);
    this.queue.forEach((data) => {
      this.currentStream!.write(data);
    });

    this.bufferCount = 0;
    this.isOpen = true;
    debug(">>>flush end");
  }

  async create() {
    this.currentStream = await this.fileHandle.createWritable({
      keepExistingData: true,
    });
    this.isOpen = true;
    this.flushIntervalId = setInterval(() => {
      this.flush();
    }, 10_000);

    window.addEventListener("beforeunload", this.flush);
  }

  async writeLine(data: string) {
    if (!this.isOpen || !this.currentStream) {
      this.queue.push(data);
      return;
    }

    debug("wirteline", data);
    this.bufferCount++;
    return this.currentStream.write(data);
  }

  async close() {
    clearInterval(this.flushIntervalId);
    window.removeEventListener("beforeunload", this.flush);
    return this.currentStream?.close();
  }
}

export class LogsPack {
  private currentFileStream?: FileStream;
  private creatingNewFile = false;
  private queue: string[] = [];

  constructor(
    private dir: FileSystemDirectoryHandle,
    private name: string,
    private maxSize: number
  ) {}

  private async getPacks() {
    const packFilenames: string[] = [];

    for await (const fileName of this.dir.keys()) {
      if (fileName.startsWith(this.name) && fileNameRegex.test(fileName)) {
        packFilenames.push(fileName);
      }
    }
    return packFilenames;
  }

  async create() {
    const packFiles = await this.getPacks();

    packFiles.sort((a, b) => {
      const [, , partA] = a.match(fileNameRegex)!;
      const [, , partB] = b.match(fileNameRegex)!;
      return Number(partA) - Number(partB);
    });
    debug(">>> pack", packFiles);

    const lastFileName = packFiles[packFiles.length - 1] ?? getFilename(this.name, 0);
    const fileHandle = await this.dir.getFileHandle(lastFileName, { create: true });
    const fileStream = new FileStream(fileHandle);
    fileStream.onFileChange = this.onFileChanged.bind(this);
    await fileStream.create();
    this.currentFileStream = fileStream;
    debug(">>> pack", this.currentFileStream.fileHandle.name);
  }

  async onFileChanged(file: File) {
    debug(">>> file change", file.size);
    if (file.size < this.maxSize) return;
    this.creatingNewFile = true;
    await this.currentFileStream?.close();

    const [, base, part] = file.name.match(fileNameRegex)!;
    const fileHandle = await this.dir.getFileHandle(getFilename(base, Number(part) + 1), {
      create: true,
    });
    const fileStream = new FileStream(fileHandle);
    await fileStream.create();
    fileStream.onFileChange = this.onFileChanged.bind(this);
    this.currentFileStream = fileStream;

    debug(">>> pack file change", this.currentFileStream.fileHandle.name);
    this.creatingNewFile = false;
  }

  async writeLine(data: string) {
    if (this.creatingNewFile) {
      this.queue.push(data);
      return;
    }

    this.currentFileStream?.writeLine(data);
  }

  async clear() {
    await this.currentFileStream?.close();
    const files = await this.getPacks();

    files.forEach((file) => {
      this.dir.removeEntry(file);
    });
  }
}
