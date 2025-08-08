import React from 'react';
import { Home, Target, Wallet, ShoppingBag, FileText, TrendingUp } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isConnected: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange, isConnected }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, requiresConnection: false },
    { id: 'missions', label: 'Missões', icon: Target, requiresConnection: true },
    { id: 'wallet', label: 'Wallet', icon: Wallet, requiresConnection: true },
    { id: 'shop', label: 'Compras', icon: ShoppingBag, requiresConnection: true },
    { id: 'whitepaper', label: 'Whitepaper', icon: FileText, requiresConnection: false },
    { id: 'presale', label: 'Pré-venda', icon: TrendingUp, requiresConnection: false },
  ];

  const availableItems = navItems.filter(item => !item.requiresConnection || isConnected);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 md:static md:bg-transparent md:border-t-0 md:px-0 md:py-0">
      <div className="flex justify-around md:justify-start md:space-x-8">
        {availableItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;