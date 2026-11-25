export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data: T;
  timestamp?: string;
}

export interface ApiError {
  status: number;
  message: string;
  data?: Record<string, string>;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}
