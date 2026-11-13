import { Optional } from '@bafx/utils';
import {
  IBaseLoggerData,
  ILogger,
  ILoggerWithTraceId,
  ILoggerWithTraceIdAndCorrelationIdAndOperationName,
  ILoggerWithTraceIdAndOperationName,
  LogLevel,
  ILoggerWithTraceIdAndCorrelationId,
} from '../interfaces';

export type EventNames<TEventKeys extends string> = {
  readonly [K in TEventKeys]: string;
};

export type BaseTypedLogger<
  TEventKeys extends string,
  TEventNames extends EventNames<TEventKeys>,
  TLogData extends IBaseLoggerData,
  TNeedsOperationName extends boolean = true,
  THasCorrelationId extends boolean = false,
> = {
  [Level in LogLevel]: <T extends TEventKeys>(
    ...args: TNeedsOperationName extends false
      ? [eventName: TEventNames[T], data: TLogData]
      : THasCorrelationId extends true
        ? [eventName: TEventNames[T], operationName: string, data: TLogData]
        : [correlationId: string | undefined, eventName: TEventNames[T], operationName: string, data: TLogData]
  ) => void;
};

export type TypedLoggerWithTraceIdAndOperation<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData> = BaseTypedLogger<
  TEventKeys,
  TEventNames,
  TLogData,
  false
> & {
  traceId: string;
  operationName: string;
};

export type TypedLoggerWithTraceId<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData> = BaseTypedLogger<
  TEventKeys,
  TEventNames,
  TLogData,
  true
> & {
  traceId: string;
};

export type TypedLoggerWithTraceIdCorrelationIdAndOperationName<
  TEventKeys extends string,
  TEventNames extends EventNames<TEventKeys>,
  TLogData extends IBaseLoggerData,
> = BaseTypedLogger<TEventKeys, TEventNames, TLogData, false, true> & {
  traceId: string;
  correlationId: string;
  operationName: string;
};

export type TypedLoggerWithTraceIdCorrelationId<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData> = BaseTypedLogger<
  TEventKeys,
  TEventNames,
  TLogData,
  true,
  true
> & {
  traceId: string;
  correlationId: string;
};

export type TypedBasicLogger<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData> = {
  [Level in LogLevel]: <T extends keyof TEventNames>(
    traceId: string | undefined,
    correlationId: string | undefined,
    eventName: TEventNames[T],
    operationName: string,
    data: TLogData,
  ) => void;
};

export function createTypedLoggerWithTraceIdAndOperation<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData>(
  logger: ILoggerWithTraceIdAndOperationName | ILoggerWithTraceIdAndCorrelationIdAndOperationName,
): TypedLoggerWithTraceIdAndOperation<TEventKeys, TEventNames, TLogData> {
  const typedLogger = {
    traceId: logger.traceId,
    operationName: logger.operationName,
  } as TypedLoggerWithTraceIdAndOperation<TEventKeys, TEventNames, TLogData>;

  (['debug', 'warn', 'info', 'error', 'security'] as const).forEach((level) => {
    typedLogger[level] = (eventName, data) => {
      return logger[level](eventName, data);
    };
  });

  return typedLogger;
}

export function createTypedLoggerWithTraceIdAndCorrelationId<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData>(
  logger: ILoggerWithTraceIdAndCorrelationId,
): TypedLoggerWithTraceIdCorrelationId<TEventKeys, TEventNames, TLogData> {
  const typedLogger = {
    traceId: logger.traceId,
    correlationId: logger.correlationId,
  } as TypedLoggerWithTraceIdCorrelationId<TEventKeys, TEventNames, TLogData>;

  (['debug', 'warn', 'info', 'error', 'security'] as const).forEach((level) => {
    typedLogger[level] = (eventName: string, operationName: string, data: Optional<object | string>) => {
      return logger[level](eventName, operationName, data);
    };
  });

  return typedLogger;
}

export function createTypedLoggerWithIdsAndOperationName<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData>(
  logger: ILoggerWithTraceIdAndCorrelationIdAndOperationName,
): TypedLoggerWithTraceIdCorrelationIdAndOperationName<TEventKeys, TEventNames, TLogData> {
  const typedLogger = {
    traceId: logger.traceId,
    operationName: logger.operationName,
    correlationId: logger.correlationId,
  } as TypedLoggerWithTraceIdCorrelationIdAndOperationName<TEventKeys, TEventNames, TLogData>;

  (['debug', 'warn', 'info', 'error', 'security'] as const).forEach((level) => {
    typedLogger[level] = (eventName: string, data: Optional<object | string>) => {
      return logger[level](eventName, data);
    };
  });

  return typedLogger;
}

export function createTypedLoggerWithTraceId<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData>(
  logger: ILoggerWithTraceId,
): TypedLoggerWithTraceId<TEventKeys, TEventNames, TLogData> {
  const typedLogger = {
    traceId: logger.traceId,
  } as TypedLoggerWithTraceId<TEventKeys, TEventNames, TLogData>;

  (['debug', 'warn', 'info', 'error', 'security'] as const).forEach((level) => {
    typedLogger[level] = (correlationId, eventName, operationName, data) => {
      return logger[level](correlationId, eventName, operationName, data);
    };
  });

  return typedLogger;
}

export function createBasicTypedLogger<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData>(
  logger: ILogger,
): TypedBasicLogger<TEventKeys, TEventNames, TLogData> {
  const typedLogger = {} as TypedBasicLogger<TEventKeys, TEventNames, TLogData>;

  (['debug', 'warn', 'info', 'error', 'security'] as const).forEach((level) => {
    typedLogger[level] = (traceId, correlationId, eventName, operationName, data) => {
      return logger[level](traceId, correlationId, eventName, operationName, data);
    };
  });

  return typedLogger;
}

export function applyOperationNameToTypedLogger<TEventKeys extends string, TEventNames extends EventNames<TEventKeys>, TLogData extends IBaseLoggerData>(
  operationName: string,
  typedLogger: TypedLoggerWithTraceIdCorrelationId<TEventKeys, TEventNames, TLogData>,
): TypedLoggerWithTraceIdCorrelationIdAndOperationName<TEventKeys, TEventNames, TLogData> {
  const baseLogger = {
    traceId: typedLogger.traceId,
    correlationId: typedLogger.correlationId,
    operationName,
  } as ILoggerWithTraceIdAndCorrelationIdAndOperationName;

  (['debug', 'warn', 'info', 'error', 'security'] as const).forEach((level) => {
    baseLogger[level] = (eventName: string, data: Optional<object | string>) => {
      const logFinal = typedLogger[level](eventName as TEventNames[TEventKeys], operationName, data as TLogData);
      return logFinal;
    };
  });

  return createTypedLoggerWithIdsAndOperationName(baseLogger);
}
