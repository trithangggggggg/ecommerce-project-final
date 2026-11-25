import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { Article, ArticleFilterParams, ArticleRequest, PageResponse } from '../../models/article.model';

export const articleService = {
  /**
   * Lấy danh sách bài viết công khai (kèm phân trang, lọc category, tìm kiếm keyword)
   * GET /api/articles
   */
  async getPublicArticles(params?: ArticleFilterParams): Promise<PageResponse<Article>> {
    const response = await axiosClient.get<ApiResponse<PageResponse<Article>>>(
      ENDPOINTS.ARTICLES,
      { params }
    );
    const data = response.data?.data || (response.data as unknown as PageResponse<Article>);
    return data;
  },

  /**
   * Xem chi tiết bài viết theo Slug chuẩn SEO (Backend tự động tăng view)
   * GET /api/articles/{slug}
   */
  async getArticleBySlug(slug: string): Promise<Article> {
    const response = await axiosClient.get<ApiResponse<Article>>(
      ENDPOINTS.ARTICLE_DETAIL(slug)
    );
    return response.data?.data || (response.data as unknown as Article);
  },

  async getPublicCategories(): Promise<string[]> {
    const response = await axiosClient.get<ApiResponse<string[]>>(ENDPOINTS.ARTICLE_CATEGORIES);
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  async getAdminCategories(): Promise<string[]> {
    const response = await axiosClient.get<ApiResponse<string[]>>(ENDPOINTS.ADMIN_ARTICLES.CATEGORIES);
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy danh sách bài viết dành cho Admin (gồm cả bài ẩn/nháp)
   * GET /api/admin/articles
   */
  async getAdminArticles(params?: ArticleFilterParams): Promise<PageResponse<Article>> {
    const response = await axiosClient.get<ApiResponse<PageResponse<Article>>>(
      ENDPOINTS.ADMIN_ARTICLES.LIST,
      { params }
    );
    const data = response.data?.data || (response.data as unknown as PageResponse<Article>);
    return data;
  },

  /**
   * Xem thông tin bài viết theo ID cho Admin
   * GET /api/admin/articles/{id}
   */
  async getAdminArticleById(id: number): Promise<Article> {
    const response = await axiosClient.get<ApiResponse<Article>>(
      ENDPOINTS.ADMIN_ARTICLES.DETAIL(id)
    );
    return response.data?.data || (response.data as unknown as Article);
  },

  /**
   * Tạo bài viết mới (Admin)
   * POST /api/admin/articles
   */
  async createArticle(payload: ArticleRequest): Promise<Article> {
    const response = await axiosClient.post<ApiResponse<Article>>(
      ENDPOINTS.ADMIN_ARTICLES.CREATE,
      payload
    );
    return response.data?.data || (response.data as unknown as Article);
  },

  /**
   * Cập nhật bài viết (Admin)
   * PUT /api/admin/articles/{id}
   */
  async updateArticle(id: number, payload: ArticleRequest): Promise<Article> {
    const response = await axiosClient.put<ApiResponse<Article>>(
      ENDPOINTS.ADMIN_ARTICLES.UPDATE(id),
      payload
    );
    return response.data?.data || (response.data as unknown as Article);
  },

  async toggleArticleStatus(id: number, status?: boolean): Promise<Article> {
    const response = await axiosClient.patch<ApiResponse<Article>>(
      ENDPOINTS.ADMIN_ARTICLES.STATUS(id),
      status !== undefined ? { status } : undefined
    );
    return response.data?.data || (response.data as unknown as Article);
  },

  /**
   * Xóa bài viết (Admin)
   * DELETE /api/admin/articles/{id}
   */
  async deleteArticle(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_ARTICLES.DELETE(id));
  },

  /**
   * Upload ảnh đại diện (Thumbnail) cho bài viết
   * POST /api/admin/articles/upload-thumbnail
   */
  async uploadThumbnail(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post<ApiResponse<{ url: string }>>(
      ENDPOINTS.ADMIN_ARTICLES.UPLOAD_THUMBNAIL,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data?.data?.url || (response.data as any)?.url || '';
  },

  /**
   * Upload ảnh chèn trong CKEditor 5
   * POST /api/admin/articles/upload-image
   */
  async uploadEditorImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('upload', file);

    const response = await axiosClient.post<{ url: string }>(
      ENDPOINTS.ADMIN_ARTICLES.UPLOAD_IMAGE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data?.url || '';
  },
};

