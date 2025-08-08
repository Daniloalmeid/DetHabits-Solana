import React from 'react';
import { LogOut } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const Header: React.FC = () => {
  const { user, isConnected, disconnectWallet } = useWallet();

  if (!isConnected) return null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">DetHabits</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Wallet conectada</p>
            <p className="text-sm font-mono text-gray-700">
              {user?.publicKey.slice(0, 4)}...{user?.publicKey.slice(-4)}
            </p>
          </div>
          <button
            onClick={disconnectWallet}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;