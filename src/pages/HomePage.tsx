import React from 'react';
import { Zap } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

interface HomePageProps {
  onPageChange: (page: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onPageChange }) => {
  const { isConnected, connecting, connectWallet } = useWallet();

  React.useEffect(() => {
    if (isConnected) {
      onPageChange('missions');
    }
  }, [isConnected, onPageChange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center shadow-2xl">
        <div className="mb-8">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">DetHabits</h1>
          <p className="text-white/80 text-lg">
            Complete missões diárias e ganhe tokens DET
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="w-full bg-white text-purple-600 font-semibold py-4 px-6 rounded-xl hover:bg-white/90 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
          >
            {connecting ? 'Conectando...' : 'Conectar Carteira Phantom'}
          </button>

          <button
            onClick={() => onPageChange('presale')}
            className="w-full bg-transparent border-2 border-white/30 text-white font-semibold py-4 px-6 rounded-xl hover:bg-white/10 transition-all duration-200 transform hover:scale-105"
          >
            Pré-venda
          </button>
        </div>

        <div className="mt-8 text-white/60 text-sm">
          <p>Suporte para PC e Mobile (Safari)</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;