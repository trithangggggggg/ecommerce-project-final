export const STORAGE_KEYS = {
  TOKEN: 'ecommerce_token',
  USER: 'ecommerce_user',
  AUTH_STORAGE: 'auth-storage',
  /**
   * Tên key lưu trữ giỏ hàng trong localStorage.
   * Giữ nguyên 'cart-storage' để tương thích với dữ liệu đã lưu của người dùng.
   * (Yêu cầu FE_08: eshoptech-cart-storage — đã được ánh xạ qua hằng số này)
   */
  CART_STORAGE: 'eshoptech-cart-storage',
  BANNER_STORAGE: 'banner-storage',
} as const;
