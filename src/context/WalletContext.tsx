import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WalletBalance, User } from '../types';

interface WalletContextType {
  user: User | null;
  isConnected: boolean;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  updateBalance: (amount: number) => void;
  completeMission: (missionId: string, reward: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = async () => {
    setConnecting(true);
    try {
      // Check if Phantom wallet is available
      if (typeof window !== 'undefined' && window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        
        // Initialize user data
        const newUser: User = {
          publicKey,
          balance: {
            total: 0,
            staked: 0,
            available: 0,
            platformReserve: 0
          },
          completedMissions: [],
          lastMissionReset: new Date()
        };
        
        setUser(newUser);
      } else {
        alert('Phantom wallet not found! Please install Phantom wallet.');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    if (window.solana && window.solana.disconnect) {
      window.solana.disconnect();
    }
    setUser(null);
  };

  const updateBalance = (amount: number) => {
    if (!user) return;
    
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        balance: {
          ...prev.balance,
          total: prev.balance.total + amount
        }
      };
    });
  };

  const completeMission = (missionId: string, reward: number) => {
    if (!user) return;

    // Calculate distributions
    const stakedAmount = reward * 0.1; // 10% to stake
    const platformReserve = reward * 0.1; // 10% to platform reserve
    const availableAmount = reward * 0.8; // 80% available

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        completedMissions: [...prev.completedMissions, missionId],
        balance: {
          total: prev.balance.total + reward,
          staked: prev.balance.staked + stakedAmount,
          available: prev.balance.available + availableAmount,
          platformReserve: prev.balance.platformReserve + platformReserve
        }
      };
    });
  };

  const isConnected = !!user;

  return (
    <WalletContext.Provider
      value={{
        user,
        isConnected,
        connecting,
        connectWallet,
        disconnectWallet,
        updateBalance,
        completeMission
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Extend Window interface for Phantom wallet
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect?: () => void;
    };
  }
}