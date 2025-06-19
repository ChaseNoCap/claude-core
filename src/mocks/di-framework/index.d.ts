export interface IResult<T> {
  success: boolean;
  value: T;
  error: Error;
}
export declare class Result {
  static success<T>(value: T): IResult<T>;
  static fail<T>(error: Error): IResult<T>;
}
export type ResultType<T> = IResult<T>;
//# sourceMappingURL=index.d.ts.map
