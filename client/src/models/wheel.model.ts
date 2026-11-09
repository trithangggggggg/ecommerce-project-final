export interface WheelReward {
  id: number;
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
}

export interface WheelStatusResponse {
  canSpin: boolean;
  hasSpunToday: boolean;
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

