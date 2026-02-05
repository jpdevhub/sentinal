import { useState, useCallback } from 'react';
import DCAAgentLayout from './DCAAgentLayout';
import SmartWorklist from './SmartWorklist';
import ActionConsole from './ActionConsole';
import MyPerformance from './MyPerformance';
import AgentLeaderboard from './AgentLeaderboard';
import { useUserProfile } from '../../contexts/UserProfileContext';

function DCAAgentPage() {
  const [activePage, setActivePage] = useState('smart-worklist');
  const [selectedCase, setSelectedCase] = useState(null);
  const { profile } = useUserProfile();

  // Handle starting a case from Smart Worklist
  const handleStartCase = useCallback((caseData) => {
    setSelectedCase(caseData);
  }, []);

  // Handle going back from Action Console
  const handleBackToWorklist = useCallback(() => {
    setSelectedCase(null);
  }, []);

  // Handle case update (refresh worklist)
  const handleCaseUpdate = useCallback(() => {
    // This will trigger a refresh when we go back
    setSelectedCase(null);
  }, []);

  const renderContent = () => {
    // If a case is selected, show the Action Console
    if (selectedCase) {
      return (
        <ActionConsole 
          caseData={selectedCase}
          profile={profile}
          onBack={handleBackToWorklist}
          onCaseUpdate={handleCaseUpdate}
        />
      );
    }

    switch (activePage) {
      case 'smart-worklist':
        return <SmartWorklist onStartCase={handleStartCase} />;
      case 'my-performance':
        return <MyPerformance />;
      case 'leaderboard':
        return <AgentLeaderboard />;
      default:
        return <SmartWorklist onStartCase={handleStartCase} />;
    }
  };

  return (
    <DCAAgentLayout 
      activePage={selectedCase ? 'action-console' : activePage} 
      onPageChange={(page) => {
        setSelectedCase(null);
        setActivePage(page);
      }}
    >
      {renderContent()}
    </DCAAgentLayout>
  );
}

export default DCAAgentPage;
