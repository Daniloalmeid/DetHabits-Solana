import React from 'react';
import { Coins, Lock, ShoppingBag, TrendingUp } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const WalletPage: React.FC = () => {
  const { user } = useWallet();

  if (!user) return null;

  const { balance } = user;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Minha Wallet</h1>
        <p className="text-gray-600">Acompanhe seus tokens DET e investimentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Total Balance */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Coins size={32} />
            <div className="text-right">
              <p className="text-purple-100">Saldo Total</p>
              <h2 className="text-3xl font-bold">{balance.total.toFixed(2)} DET</h2>
            </div>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <ShoppingBag className="text-teal-600" size={32} />
            <div className="text-right">
              <p className="text-gray-500">Disponível</p>
              <h2 className="text-2xl font-bold text-gray-900">{balance.available.toFixed(2)} DET</h2>
            </div>
          </div>
          <p className="text-sm text-gray-600">Para uso na plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staking */}
        <div className="bg-white rounded-2xl p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <Lock className="text-orange-600" size={28} />
            <div className="text-right">
              <p className="text-gray-500">Em Stake</p>
              <h3 className="text-xl font-bold text-gray-900">{balance.staked.toFixed(2)} DET</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rendimento:</span>
              <span className="font-semibold text-orange-600">300% ao ano</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bloqueio:</span>
              <span className="font-semibold text-gray-900">3 meses</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rendimento estimado:</span>
              <span className="font-semibold text-green-600">+{(balance.staked * 0.75).toFixed(2)} DET/mês</span>
            </div>
          </div>
        </div>

        {/* Platform Reserve */}
        <div className="bg-white rounded-2xl p-6 border-2 border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="text-teal-600" size={28} />
            <div className="text-right">
              <p className="text-gray-500">Reserva Plataforma</p>
              <h3 className="text-xl font-bold text-gray-900">{balance.platformReserve.toFixed(2)} DET</h3>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            10% dos ganhos automaticamente reservados para compras na plataforma
          </p>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Como Funciona</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• <strong>80%</strong> dos tokens ganhos ficam disponíveis para você</p>
          <p>• <strong>10%</strong> vão automaticamente para stake com 300% ao ano</p>
          <p>• <strong>10%</strong> ficam reservados para compras na plataforma</p>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;