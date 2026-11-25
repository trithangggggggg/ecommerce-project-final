import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse, PageResponse } from '../../models/api.model';

export interface SystemSettingItem {
  id: number;
  settingKey: string;
  settingValue: string;
  settingGroup: string;
  label?: string;
  description?: string;
  valueType?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicSiteConfig {
  values: Record<string, string>;
  shipping: {
    freeshipThreshold: number;
    halfShipThreshold: number;
    defaultFee: number;
    estimatedLeadTime: string;
  };
  payment: {
    codEnabled: boolean;
    sepayEnabled: boolean;
    vnpayEnabled: boolean;
  };
  store: {
    name: string;
    shortName: string;
    tagline: string;
    hotline: string;
    hotlineLabel: string;
    email: string;
    address: string;
    openHours: string;
    copyright: string;
  };
  social: {
    facebookUrl: string;
    youtubeUrl: string;
    zaloUrl: string;
  };
  general: {
    wheelEnabled: boolean;
    promoTickerText: string;
    flashSaleBannerTitle: string;
  };
}

export const settingService = {
  async getPublicSettings(): Promise<PublicSiteConfig> {
    const res = await axiosClient.get<ApiResponse<PublicSiteConfig>>(ENDPOINTS.SETTINGS_PUBLIC);
    return res.data?.data;
  },

  async searchAdminSettings(params?: {
    keyword?: string;
    group?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<SystemSettingItem>> {
    const res = await axiosClient.get<ApiResponse<PageResponse<SystemSettingItem>>>(
      ENDPOINTS.ADMIN_SETTINGS.LIST,
      { params }
    );
    return res.data?.data;
  },

  async getAllAdminSettings(group?: string): Promise<SystemSettingItem[]> {
    const res = await axiosClient.get<ApiResponse<SystemSettingItem[]>>(ENDPOINTS.ADMIN_SETTINGS.ALL, {
      params: group ? { group } : undefined,
    });
    const data = res.data?.data;
    return Array.isArray(data) ? data : [];
  },

  async getSettingById(id: number): Promise<SystemSettingItem> {
    const res = await axiosClient.get<ApiResponse<SystemSettingItem>>(ENDPOINTS.ADMIN_SETTINGS.DETAIL(id));
    return res.data?.data;
  },

  async createSetting(payload: Partial<SystemSettingItem>): Promise<SystemSettingItem> {
    const res = await axiosClient.post<ApiResponse<SystemSettingItem>>(ENDPOINTS.ADMIN_SETTINGS.LIST, payload);
    return res.data?.data;
  },

  async updateSetting(id: number, payload: Partial<SystemSettingItem>): Promise<SystemSettingItem> {
    const res = await axiosClient.put<ApiResponse<SystemSettingItem>>(ENDPOINTS.ADMIN_SETTINGS.DETAIL(id), payload);
    return res.data?.data;
  },

  async bulkSaveSettings(payload: Record<string, string | number | boolean>): Promise<SystemSettingItem[]> {
    const res = await axiosClient.put<ApiResponse<SystemSettingItem[]>>(ENDPOINTS.ADMIN_SETTINGS.BULK, payload);
    const data = res.data?.data;
    return Array.isArray(data) ? data : [];
  },

  async deleteSetting(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_SETTINGS.DETAIL(id));
  },
};

