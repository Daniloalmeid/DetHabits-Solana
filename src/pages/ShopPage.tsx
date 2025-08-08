import React from 'react';
import { ShoppingBag, Star } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const ShopPage: React.FC = () => {
  const { user } = useWallet();

  const shopItems = [
    {
      id: 1,
      name: 'NFT Exclusive DetHabits',
      price: 100,
      image: 'https://images.pexels.com/photos/7129708/pexels-photo-7129708.jpeg?auto=compress&cs=tinysrgb&w=400',
      description: 'NFT exclusivo para membros ativos'
    },
    {
      id: 2,
      name: 'Boost de Missões x2',
      price: 50,
      image: 'https://images.pexels.com/photos/7566060/pexels-photo-7566060.jpeg?auto=compress&cs=tinysrgb&w=400',
      description: 'Dobre seus ganhos por 7 dias'
    },
    {
      id: 3,
      name: 'Acesso Premium',
      price: 200,
      image: 'https://images.pexels.com/photos/8849295/pexels-photo-8849295.jpeg?auto=compress&cs=tinysrgb&w=400',
      description: 'Missões exclusivas e rewards extras'
    },
    {
      id: 4,
      name: 'Merchandise DetHabits',
      price: 75,
      image: 'https://images.pexels.com/photos/8853502/pexels-photo-8853502.jpeg?auto=compress&cs=tinysrgb&w=400',
      description: 'Camiseta oficial da comunidade'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loja DetHabits</h1>
        <p className="text-gray-600">Use seus tokens DET para comprar itens exclusivos</p>
        
        {user && (
          <div className="mt-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="text-teal-600" size={24} />
                <div>
                  <p className="font-semibold text-gray-900">Seus Tokens Disponíveis</p>
                  <p className="text-sm text-gray-600">Para compras na plataforma</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-teal-600">
                  {(user.balance.available + user.balance.platformReserve).toFixed(2)} DET
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shopItems.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200">
            <div className="aspect-w-16 aspect-h-10">
              <img 
                src={item.image} 
                alt={item.name}
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                <div className="flex items-center text-yellow-500">
                  <Star size={16} fill="currentColor" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{item.description}</p>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-purple-600">
                  {item.price} DET
                </div>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                  Comprar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-purple-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Como Funciona</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• Use tokens DET da sua carteira disponível e reserva da plataforma</p>
          <p>• Itens comprados são enviados para seu endereço registrado</p>
          <p>• NFTs são transferidos automaticamente para sua wallet</p>
          <p>• Novos itens são adicionados semanalmente</p>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;