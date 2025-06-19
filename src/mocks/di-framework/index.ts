export interface IResult<T> {
  success: boolean;
  value: T;
  error: Error;
}

export class Result {
  static success<T>(value: T): IResult<T> {
    return {
      success: true,
      value,
      error: null as any,
    };
  }

  static fail<T>(error: Error): IResult<T> {
    return {
      success: false,
      value: null as any,
      error,
    };
  }
}

// For backward compatibility with non-generic usage
export type ResultType<T> = IResult<T>;
