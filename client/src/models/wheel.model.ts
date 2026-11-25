export interface WheelReward {
  id: number;
  entityId?: number;
  label: string;
  shortLabel: string;
  discount: string;
  type: 'ORDER' | 'SHIPPING';
  minOrder: string;
  maxDiscountAmount?: number | null;
  weight: number;
  color: string;
  textColor: string;
  icon?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface WheelStatusResponse {
  canSpin: boolean;
  hasSpunToday: boolean;
  remainingSpins?: number;
  message: string;
  todayVoucherCode?: string;
  todayRewardLabel?: string;
  rewards: WheelReward[];
}

export interface WheelSpinResponse {
  rewardIndex: number;
  reward: WheelReward;
  voucherCode: string;
  voucher: any;
  message: string;
}

export interface AdminWheelSpinHistoryItem {
  id: number;
  userId: number;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  spinDate: string;
  rewardId: number;
  rewardLabel: string;
  voucherCode: string;
  createdAt: string;
  usedCount?: number;
  voucherStatus?: string;
  discount?: string;
  minOrder?: string;
}

export interface RewardDistributionItem {
  rewardId: number;
  rewardLabel: string;
  count: number;
  percentage: number;
}

export interface AdminWheelStatsResponse {
  totalSpins: number;
  spinsToday: number;
  uniqueUsers: number;
  vouchersIssued: number;
  vouchersUsed: number;
  rewardDistributions: RewardDistributionItem[];
}

export interface AdminWheelHistoryParams {
  search?: string;
  date?: string;
  page?: number;
  size?: number;
}
