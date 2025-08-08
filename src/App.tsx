import React, { useState } from 'react';
import { WalletProvider } from './context/WalletContext';
import Navigation from './components/Navigation';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import MissionsPage from './pages/MissionsPage';
import WalletPage from './pages/WalletPage';
import ShopPage from './pages/ShopPage';
import WhitepaperPage from './pages/WhitepaperPage';
import PresalePage from './pages/PresalePage';
import { useWallet } from './context/WalletContext';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const { isConnected } = useWallet();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onPageChange={setCurrentPage} />;
      case 'missions':
        return <MissionsPage />;
      case 'wallet':
        return <WalletPage />;
      case 'shop':
        return <ShopPage />;
      case 'whitepaper':
        return <WhitepaperPage />;
      case 'presale':
        return <PresalePage />;
      default:
        return <HomePage onPageChange={setCurrentPage} />;
    }
  };

  if (currentPage === 'home' && !isConnected) {
    return <HomePage onPageChange={setCurrentPage} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-20 md:pb-0">
        {renderPage()}
      </main>
      <Navigation 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isConnected={isConnected}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
};

export default App;