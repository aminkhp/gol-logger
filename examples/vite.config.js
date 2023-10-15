/** @type {import('vite').UserConfig} */
export default {
  build: {
    target: "esnext",
    modulePreload: false
  },
  optimizeDeps: {
    exclude: ["gol-logger"]
  }
}
