import React, { useState } from 'react';
import { TrendingUp, Gift, Clock, Users } from 'lucide-react';

const PresalePage: React.FC = () => {
  const [amount, setAmount] = useState<string>('');

  const presaleInfo = {
    price: 0.1, // USD per DET
    raised: 125000, // USD raised
    target: 500000, // USD target
    participants: 1250,
    timeLeft: '15 dias'
  };

  const calculateTokens = (usdAmount: number): number => {
    return usdAmount / presaleInfo.price;
  };

  const progressPercentage = (presaleInfo.raised / presaleInfo.target) * 100;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Pré-venda DetHabits</h1>
        <p className="text-gray-600 text-lg">Seja um dos primeiros investidores e receba tokens DET com desconto</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Presale Info */}
        <div className="space-y-6">
          {/* Progress */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Progresso da Pré-venda</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Arrecadado</span>
                <span className="font-semibold">${presaleInfo.raised.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Meta: ${presaleInfo.target.toLocaleString()}</span>
                <span className="font-semibold text-purple-600">{progressPercentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <Users className="text-teal-600 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-900">{presaleInfo.participants}</div>
              <div className="text-sm text-gray-600">Participantes</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <Clock className="text-orange-600 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-900">{presaleInfo.timeLeft}</div>
              <div className="text-sm text-gray-600">Restantes</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Gift className="text-purple-600 mr-2" size={20} />
              Benefícios da Pré-venda
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>50% de desconto</strong> no preço de lançamento</li>
              <li>• <strong>Bonus de 20%</strong> em tokens extras</li>
              <li>• <strong>Acesso antecipado</strong> à plataforma</li>
              <li>• <strong>NFT exclusivo</strong> para early adopters</li>
              <li>• <strong>Staking premium</strong> com 400% ao ano</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Purchase */}
        <div className="space-y-6">
          {/* Purchase Form */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Comprar Tokens DET</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor em USD
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {amount && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Tokens DET:</span>
                    <span className="font-bold text-purple-600">
                      {calculateTokens(Number(amount)).toLocaleString()} DET
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Bonus (20%):</span>
                    <span className="font-bold text-green-600">
                      +{(calculateTokens(Number(amount)) * 0.2).toLocaleString()} DET
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-purple-600">
                      {(calculateTokens(Number(amount)) * 1.2).toLocaleString()} DET
                    </span>
                  </div>
                </div>
              )}

              <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105">
                Comprar com Cartão
              </button>

              <button className="w-full bg-transparent border-2 border-purple-600 text-purple-600 font-semibold py-4 px-6 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200">
                Conectar Wallet Solana
              </button>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Níveis de Investimento</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">Básico</div>
                  <div className="text-sm text-gray-600">$100 - $999</div>
                </div>
                <div className="text-purple-600 font-semibold">+20% bonus</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">Premium</div>
                  <div className="text-sm text-gray-600">$1,000 - $4,999</div>
                </div>
                <div className="text-blue-600 font-semibold">+30% bonus</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-900">VIP</div>
                  <div className="text-sm text-gray-600">$5,000+</div>
                </div>
                <div className="text-purple-600 font-semibold">+50% bonus</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Aviso de Risco</h4>
        <p className="text-yellow-700 text-sm">
          Investimentos em criptomoedas envolvem riscos. Invista apenas o que você pode perder. 
          Este não é um conselho de investimento. Sempre faça sua própria pesquisa (DYOR).
        </p>
      </div>
    </div>
  );
};

export default PresalePage;