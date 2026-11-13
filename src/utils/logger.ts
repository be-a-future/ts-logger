import { curry, Optional } from '@bafx/utils';
import * as uuid from 'uuid';
import {
  ILogger,
  ILoggerWithTraceId,
  ILoggerWithTraceIdAndCorrelationId,
  ILoggerWithTraceIdAndCorrelationIdAndOperationName,
  ILoggerWithTraceIdAndOperationName,
  LogLevel,
} from '../interfaces';

/**
 * Generates new traceId
 */
export const generateTraceId: () => string = uuid.v4;

type ApplyTraceId = {
  (traceId: string): (logger: ILogger) => ILoggerWithTraceId;
  (traceId: string, logger: ILogger): ILoggerWithTraceId;
};

export const applyTraceId: ApplyTraceId = curry((traceId: string, logger: ILogger): ILoggerWithTraceId => ({
  debug: logger.debug(traceId),
  info: logger.info(traceId),
  warn: logger.warn(traceId),
  error: logger.error(traceId),
  security: logger.security(traceId),
  traceId: traceId,
}));

type ApplyCorrelationId = {
  (correlationId: string): (logger: ILoggerWithTraceId) => ILoggerWithTraceIdAndCorrelationId;
  (correlationId: string, logger: ILoggerWithTraceId): ILoggerWithTraceIdAndCorrelationId;
};

export const applyCorrelationId: ApplyCorrelationId = curry((correlationId: string, logger: ILoggerWithTraceId): ILoggerWithTraceIdAndCorrelationId => ({
  debug: (eventName, operationName, data) => logger.debug(correlationId, eventName, operationName, data),
  info: (eventName, operationName, data) => logger.info(correlationId, eventName, operationName, data),
  warn: (eventName, operationName, data) => logger.warn(correlationId, eventName, operationName, data),
  error: (eventName, operationName, data) => logger.error(correlationId, eventName, operationName, data),
  security: (eventName, operationName, data) => logger.security(correlationId, eventName, operationName, data),
  traceId: logger.traceId,
  correlationId: correlationId,
}));

type ApplyTraceIdAndCorrelationId = {
  (traceId: Optional<string>, correlationId: Optional<string>): (logger: ILogger) => ILoggerWithTraceIdAndCorrelationId;
  (traceId: Optional<string>, correlationId: Optional<string>, logger: ILogger): ILoggerWithTraceIdAndCorrelationId;
};

export const applyTraceIdAndCorrelationId: ApplyTraceIdAndCorrelationId = curry(
  (traceId: string, correlationId: string, logger: ILogger): ILoggerWithTraceIdAndCorrelationId => ({
    debug: logger.debug(traceId, correlationId),
    info: logger.info(traceId, correlationId),
    warn: logger.warn(traceId, correlationId),
    error: logger.error(traceId, correlationId),
    security: logger.security(traceId, correlationId),
    traceId: traceId,
    correlationId: correlationId,
  }),
);

type ApplyOperationName = {
  (operationName: string): {
    (logger: ILoggerWithTraceIdAndCorrelationId): ILoggerWithTraceIdAndCorrelationIdAndOperationName;
    (logger: ILoggerWithTraceId): ILoggerWithTraceIdAndOperationName;
    (logger: ILogger): ILoggerWithTraceIdAndOperationName;
  };
  (operationName: string, logger: ILoggerWithTraceIdAndCorrelationId): ILoggerWithTraceIdAndCorrelationIdAndOperationName;
  (operationName: string, logger: ILoggerWithTraceId): ILoggerWithTraceIdAndOperationName;
  (operationName: string, logger: ILogger): ILoggerWithTraceIdAndOperationName;
};

const bindOperationName = (logger: ILoggerWithTraceIdAndCorrelationId, operationName: string) => (level: LogLevel) => (eventName: string, data: Optional<object | string>) =>
  logger[level](eventName, operationName, data);

const hasProperty =
  <T extends object>(property: keyof T) =>
  (value: object): value is T =>
    property in value;

const hasCorrelationId = hasProperty('correlationId');
const hasTraceId = hasProperty('traceId');

const ensureLoggerIds = (logger: ILogger | ILoggerWithTraceId | ILoggerWithTraceIdAndCorrelationId): ILoggerWithTraceIdAndCorrelationId => {
  if (hasCorrelationId(logger)) {
    return logger;
  }
  if (hasTraceId(logger)) {
    return applyCorrelationId('0', logger);
  }
  return applyTraceIdAndCorrelationId('0', '0', logger);
};

export const applyOperationName: ApplyOperationName = curry(
  (operationName: string, logger: ILogger | ILoggerWithTraceId | ILoggerWithTraceIdAndCorrelationId): ILoggerWithTraceIdAndCorrelationIdAndOperationName => {
    const loggerWithIds = ensureLoggerIds(logger);
    const createLogMethod = bindOperationName(loggerWithIds, operationName);
    return {
      debug: createLogMethod('debug'),
      info: createLogMethod('info'),
      warn: createLogMethod('warn'),
      error: createLogMethod('error'),
      security: createLogMethod('security'),
      traceId: loggerWithIds.traceId,
      correlationId: loggerWithIds.correlationId,
      operationName,
    };
  },
);

const bool = <T>(a: T) => !!a;

export const appendWhen =
  <R, K>(itemFactory: () => R, condition: K) =>
  <T>(arr: T[]): Array<T | R> | Array<T> => {
    return bool(condition) ? [...arr, itemFactory()] : arr;
  };
