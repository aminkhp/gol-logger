export function formatTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const milliseconds = date.getMilliseconds().toString().padEnd(3, "0");

  return `[${hours}:${minutes}:${seconds}.${milliseconds}]`;
}

export function getBaseFilename(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getFilename(date: Date | string, part: number) {
  if (typeof date === "string") return `${date}(${part}).log`;

  return `${getBaseFilename(date)}(${part}).log`;
}