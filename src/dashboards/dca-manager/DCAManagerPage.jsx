import { useState } from 'react';
import DCAManagerLayout from './DCAManagerLayout';
import DCADashboard from './DCADashboard';
import CommandCenter from './CommandCenter';
import FinanceSettlements from './FinanceSettlements';
import Leaderboard from './Leaderboard';

function DCAManagerPage() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <DCADashboard />;
      case 'command-center':
        return <CommandCenter />;
      case 'finance':
        return <FinanceSettlements />;
      case 'leaderboard':
        return <Leaderboard />;
      default:
        return <DCADashboard />;
    }
  };

  return (
    <DCAManagerLayout 
      activePage={activePage} 
      onPageChange={setActivePage}
    >
      {renderContent()}
    </DCAManagerLayout>
  );
}

export default DCAManagerPage;