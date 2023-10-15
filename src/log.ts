export const debugMode = {
  value: false,
}
export function debug(...args: any[]) {
  if(debugMode.value) {
    console.log(">>> gol:", ...args);
  }
}