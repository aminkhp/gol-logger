# Gol

Browser logger

## Install

```
npm install gol-logger
```

## Usage

```ts
const gol = new Gol();

gol.critical("module a", "WAAAAAY!");
gol.error("component x", "opps");
gol.warn("file", "not found");
gol.info("api", "request c", { params: ["a", "b"] });
gol.debug("db", "data");
```

```ts
const logger = gol.getLogger("Module A");

logger.critical("WAAAAAY!");
logger.error("oppes");
logger.warn("not found");
logger.info("api", "request c", { params: ["a", "b"] });
logger.debug("data", { a: 1 });
```
