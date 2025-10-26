/**
 * Result type for error handling without exceptions
 * Inspired by Rust's Result<T, E> type
 * @module utils/result
 */

/**
 * Success result
 */
export type Ok<T> = {
  ok: true;
  value: T;
};

/**
 * Error result
 */
export type Err<E> = {
  ok: false;
  error: E;
};

/**
 * Result type that can be either Ok or Err
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Create a success result
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard to check if result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard to check if result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 * Unwrap a Result, throwing if it's an error
 * Use sparingly - prefer pattern matching with isOk/isErr
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isErr(result)) {
    throw result.error;
  }
  return result.value;
}

/**
 * Unwrap a Result, returning a default value if it's an error
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 * Map a Result's success value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

/**
 * Map a Result's error value
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 * Chain Results together (flatMap)
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}

/**
 * Wrap an async function that might throw in a Result
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  errorFn?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    const mappedError = errorFn ? errorFn(error) : (error as E);
    return err(mappedError);
  }
}

/**
 * Wrap a function that might throw in a Result
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  errorFn?: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    const mappedError = errorFn ? errorFn(error) : (error as E);
    return err(mappedError);
  }
}
