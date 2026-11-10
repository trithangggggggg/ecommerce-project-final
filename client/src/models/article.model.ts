export interface Article {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnail?: string;
  category?: string;
  views: number;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleRequest {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  thumbnail?: string;
  category?: string;
  status?: boolean;
}

export interface ArticleFilterParams {
  category?: string;
  keyword?: string;
  status?: boolean;
  page?: number;
  size?: number;
  sort?: string;
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

