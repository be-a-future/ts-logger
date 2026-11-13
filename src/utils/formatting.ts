import { TransformableInfo } from 'logform';

interface ExtendedTransformableInfo extends TransformableInfo {
  data?: string | Record<string, string | number>;
}

// UUID and string utilities
const printZeroes = (count: number): string => '0'.repeat(count);
export const defaultUUID = () => [printZeroes(8), printZeroes(4), printZeroes(4), printZeroes(4), printZeroes(12)].join('-');
export const toString = (obj: object | string | null | undefined) => (typeof obj === 'string' ? obj : JSON.stringify(obj));

// Formatting utilities
export const isStringOrNumber = <T>(value: T) => ['string', 'number'].includes(typeof value);
export const withoutNewLines = (value: string | number) => value.toString().replace(/\n/g, '');
export const isNonEmptyString = (str: string) => str !== undefined && str !== null && str !== '';

export const formatLogData = (data: Record<string, string | number> | string): string => {
  if (typeof data === 'string') {
    return withoutNewLines(data);
  }

  return Object.getOwnPropertyNames(data).reduce((accumulator, key) => {
    const value = data[key];

    if (!isStringOrNumber(value)) {
      return accumulator;
    }

    const formattedPair = `<${key}>:${withoutNewLines(value)}`;
    return  [accumulator, formattedPair].filter(isNonEmptyString).join(';');
  }, '');
};

export const formatLogMessage = (props: ExtendedTransformableInfo): string => {
  const bits = [
    props.timestamp,
    props.informationSystem,
    props.environment,
    props.version ?? '0',
    props.traceId || defaultUUID(),
    props.correlationId || '0',
    props.service,
    props.level,
    props.eventName,
    props.operationName,
  ];

  if (props.data) {
    bits.push(formatLogData(props.data));
  }

  return bits.join('|');
};
