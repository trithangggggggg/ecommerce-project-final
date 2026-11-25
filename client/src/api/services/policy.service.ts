import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import type { ApiResponse, PageResponse } from '../../models/api.model';

export interface PolicyItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  summary?: string | null;
  content: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PolicyPayload {
  title: string;
  slug?: string;
  category: string;
  summary?: string;
  content: string;
  displayOrder?: number;
  isActive?: boolean;
}

export const policyService = {
  async getPublicPolicies(): Promise<PolicyItem[]> {
    try {
      const res = await axiosClient.get<ApiResponse<PolicyItem[]>>(ENDPOINTS.POLICIES);
      const data = res.data?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getPublicPolicyBySlug(slug: string): Promise<PolicyItem> {
    const res = await axiosClient.get<ApiResponse<PolicyItem>>(ENDPOINTS.POLICY_BY_SLUG(slug));
    return res.data?.data;
  },

  async searchAdminPolicies(params?: {
    keyword?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<PolicyItem>> {
    const res = await axiosClient.get<ApiResponse<PageResponse<PolicyItem>>>(ENDPOINTS.ADMIN_POLICIES.LIST, {
      params,
    });
    return res.data?.data;
  },

  async getAdminPolicyById(id: number): Promise<PolicyItem> {
    const res = await axiosClient.get<ApiResponse<PolicyItem>>(ENDPOINTS.ADMIN_POLICIES.DETAIL(id));
    return res.data?.data;
  },

  async createPolicy(payload: PolicyPayload): Promise<PolicyItem> {
    const res = await axiosClient.post<ApiResponse<PolicyItem>>(ENDPOINTS.ADMIN_POLICIES.LIST, payload);
    return res.data?.data;
  },

  async updatePolicy(id: number, payload: PolicyPayload): Promise<PolicyItem> {
    const res = await axiosClient.put<ApiResponse<PolicyItem>>(ENDPOINTS.ADMIN_POLICIES.DETAIL(id), payload);
    return res.data?.data;
  },

  async togglePolicyStatus(id: number, isActive?: boolean): Promise<PolicyItem> {
    const res = await axiosClient.patch<ApiResponse<PolicyItem>>(
      ENDPOINTS.ADMIN_POLICIES.STATUS(id),
      isActive !== undefined ? { isActive } : undefined
    );
    return res.data?.data;
  },

  async deletePolicy(id: number): Promise<void> {
    await axiosClient.delete(ENDPOINTS.ADMIN_POLICIES.DETAIL(id));
  },
};

