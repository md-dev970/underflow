const defaultCodeForStatus = (statusCode: number): string => {
  switch (statusCode) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 429:
      return "rate_limited";
    default:
      return "internal_error";
  }
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly code: string;

  constructor(message: string, statusCode = 500, details?: unknown, code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.code = code ?? defaultCodeForStatus(statusCode);
  }
}
