import Gol from "../index.ts";

const logger = new Gol("Debug", {
  withSymbols: true
});

logger.critical('test', "WAAAAAY!", {a: 1})
logger.warn('not', "AHHH");
logger.warn('not', "AHHH");
logger.debug('chick', "EMMM");

logger.error('some', "OHHH");
logger.info('fono', "EEHEM");

logger.warn('not', "AHHH");
logger.debug('chick', "EMMM");
logger.debug('chick', "EMMM");

logger.info('fono', "EEHEM");
logger.info('fono', "EEHEM");
logger.info('fono', "EEHEM");
logger.critical('test', "WAAAAAY!", {a: 1})

logger.info('fono', "EEHEM");

logger.debug('chick', "EMMM");
logger.error('some', "OHHH");
logger.error('some', "OHHH");
logger.debug('chick', "EMMM");
logger.debug('chick', "EMMM");
logger.debug('chick', "EMMM");
