export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiFailure = {
  success: false;
  message: string;
  data: null;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, message: string): ApiSuccess<T> {
  return { success: true, message, data };
}

export function fail(message: string): ApiFailure {
  return { success: false, message, data: null };
}