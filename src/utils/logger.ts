import { curry, Optional } from '@bafx/utils';
import * as uuid from 'uuid';
import {
  ILogger,
  ILoggerWithTraceId,
  ILoggerWithTraceIdAndCorrelationId,
  ILoggerWithTraceIdAndCorrelationIdAndOperationName,
  ILoggerWithTraceIdAndOperationName,
  ILogWithTraceIdAndOperationName,
  LogLevel,
} from '../interfaces';
import { defaultUUID } from './formatting';

/**
 * Generates new traceId
 */
export const generateTraceId: () => string = uuid.v4;

type ApplyTraceId = {
  (traceId: Optional<string>): (logger: ILogger) => ILoggerWithTraceId;
  (traceId: Optional<string>, logger: ILogger): ILoggerWithTraceId;
};

export const applyTraceId: ApplyTraceId = curry((traceId: string | undefined, logger: ILogger): ILoggerWithTraceId => ({
  debug: logger.debug(traceId),
  info: logger.info(traceId),
  warn: logger.warn(traceId),
  error: logger.error(traceId),
  security: logger.security(traceId),
  traceId: traceId || defaultUUID(),
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
  (traceId: string | undefined, correlationId: string | undefined, logger: ILogger): ILoggerWithTraceIdAndCorrelationId => ({
    debug: logger.debug(traceId, correlationId),
    info: logger.info(traceId, correlationId),
    warn: logger.warn(traceId, correlationId),
    error: logger.error(traceId, correlationId),
    security: logger.security(traceId, correlationId),
    traceId: traceId || defaultUUID(),
    correlationId: correlationId || defaultUUID(),
  }),
);

type ApplyOperationName = {
  (operationName: string): {
    (logger: ILoggerWithTraceIdAndCorrelationId): ILoggerWithTraceIdAndCorrelationIdAndOperationName;
    (logger: ILoggerWithTraceId): ILoggerWithTraceIdAndOperationName;
  };
  (operationName: string, logger: ILoggerWithTraceIdAndCorrelationId): ILoggerWithTraceIdAndCorrelationIdAndOperationName;
  (operationName: string, logger: ILoggerWithTraceId): ILoggerWithTraceIdAndOperationName;
};

const getLogFunction = (logger: ILoggerWithTraceIdAndCorrelationId, operationName: string) => (level: LogLevel) => (eventName: string, data: Optional<object | string>) =>
  logger[level](eventName, operationName, data);
const getLogWithOperation =
  (logger: ILoggerWithTraceId, operationName: string, correlationId: undefined) =>
  (level: LogLevel): ILogWithTraceIdAndOperationName =>
  (eventName: string, data: Optional<object | string>) =>
    logger[level](correlationId, eventName, operationName, data);

const hasCorrelationId = (logger: ILoggerWithTraceId | ILoggerWithTraceIdAndCorrelationId): logger is ILoggerWithTraceIdAndCorrelationId => 'correlationId' in logger;

export const applyOperationName: ApplyOperationName = curry((operationName: string, logger: ILoggerWithTraceId | ILoggerWithTraceIdAndCorrelationId) => {
  if (hasCorrelationId(logger)) {
    const logFunction = getLogFunction(logger, operationName);
    return {
      debug: logFunction('debug'),
      info: logFunction('info'),
      warn: logFunction('warn'),
      error: logFunction('error'),
      security: logFunction('security'),
      traceId: logger.traceId,
      correlationId: logger.correlationId,
      operationName,
    } as ILoggerWithTraceIdAndCorrelationIdAndOperationName;
  }

  const logWithOperation = getLogWithOperation(logger, operationName, undefined);
  return {
    debug: logWithOperation('debug'),
    info: logWithOperation('info'),
    warn: logWithOperation('warn'),
    error: logWithOperation('error'),
    security: logWithOperation('security'),
    traceId: logger.traceId,
    operationName,
  } as ILoggerWithTraceIdAndOperationName;
});

const bool = <T>(a: T) => !!a;

export const appendWhen =
  <R, K>(itemFactory: () => R, condition: K) =>
  <T>(arr: T[]): Array<T | R> | Array<T> => {
    return bool(condition) ? [...arr, itemFactory()] : arr;
  };
