import { Gol, LogLevel } from "gol";

const gol = new Gol(LogLevel.Debug, {});

const logger = gol.getLogger("Module A");

gol.critical("module a", "WAAAAAY!");
gol.error("component x", "oppes");
gol.warn("file", "not found");
gol.info("api", "request c");
gol.debug("db", "data");

logger.critical("module a", "WAAAAAY!");
logger.error("component x", "oppes");
logger.warn("file", "not found");
logger.info("api", "request c");
logger.debug("db", "data", { a: 1 });
