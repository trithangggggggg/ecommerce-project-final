import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../../models/api.model';
import type { Product } from '../../models/product.model';
import { mapBackendProduct, type BackendProduct } from './product.service';

export interface WishlistToggleResult {
  productId: number;
  liked: boolean;
  count: number;
  productIds: number[];
}

export const wishlistService = {
  async getMyWishlist(): Promise<Product[]> {
    const res = await axiosClient.get<ApiResponse<BackendProduct[]>>(ENDPOINTS.WISHLIST.LIST);
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data.map(mapBackendProduct) : [];
  },

  async getMyWishlistIds(): Promise<number[]> {
    const res = await axiosClient.get<ApiResponse<number[]>>(ENDPOINTS.WISHLIST.IDS);
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data.map(Number) : [];
  },

  async toggleWishlist(productId: number | string): Promise<WishlistToggleResult> {
    const res = await axiosClient.post<ApiResponse<WishlistToggleResult>>(ENDPOINTS.WISHLIST.TOGGLE(productId));
    return (res.data?.data || res.data) as WishlistToggleResult;
  },

  async addToWishlist(productId: number | string): Promise<Product | null> {
    const res = await axiosClient.post<ApiResponse<BackendProduct>>(ENDPOINTS.WISHLIST.ITEM(productId));
    const data = res.data?.data || res.data;
    return data ? mapBackendProduct(data as BackendProduct) : null;
  },

  async removeFromWishlist(productId: number | string): Promise<void> {
    await axiosClient.delete(ENDPOINTS.WISHLIST.ITEM(productId));
  },
};

export default wishlistService;

