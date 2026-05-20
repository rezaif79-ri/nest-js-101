export interface FailResponse {
  status: 'fail';
  message: string;
  errors?: Array<{ field?: string; message: string }>;
}

export interface ErrorResponse {
  status: 'error';
  message: string;
}
