export interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  imageRequired: boolean;
  completedAt?: Date;
}

export interface WalletBalance {
  total: number;
  staked: number;
  available: number;
  platformReserve: number;
}

export interface User {
  publicKey: string;
  balance: WalletBalance;
  completedMissions: string[];
  lastMissionReset: Date;
}