import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import NotificationDrawer from './components/NotificationDrawer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Occupancy from './pages/Occupancy';
import Forecasting from './pages/Forecasting';
import StaffManagement from './pages/StaffManagement';
import Reports from './pages/Reports';
import GuestPortal from './pages/GuestPortal';
import CostOptimization from './pages/CostOptimization';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Loading Splash Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-luxury-gold/30"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold"></div>
          </div>
          <p className="text-xs font-mono tracking-widest text-slate-500 uppercase">HospitalityAI Security Sync...</p>
        </div>
      </div>
    );
  }

  // Not logged in route
  if (!user) {
    return <Login />;
  }

  // Resident Guest portal route
  if (user.role === 'guest') {
    return <GuestPortal />;
  }

  // Logged in main frame router
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'occupancy':
        return <Occupancy />;
      case 'forecasting':
        return <Forecasting />;
      case 'staff':
        return <StaffManagement />;
      case 'costs':
        return <CostOptimization />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  const pageTitles = {
    dashboard: 'Executive Dashboard',
    occupancy: 'Reservations & Occupancy Ledger',
    forecasting: 'AI Predictive Forecasting & Shift Optimization',
    staff: 'Employee shift Scheduling & Performance',
    costs: 'Cost Optimization & Labor Analysis',
    reports: 'Analytical Reports & Auditing'
  };

  return (
    <div className="min-h-screen bg-luxury-cream dark:bg-luxury-dark text-slate-800 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* Sidebar - Hidden on print */}
      <div className="print:hidden">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* Main Container - Expands fully on print */}
      <div className="flex-1 pl-64 print:pl-0 flex flex-col min-h-screen min-w-0">
        
        {/* Top Navbar - Hidden on print */}
        <div className="print:hidden">
          <Navbar pageTitle={pageTitles[currentPage]} toggleDrawer={() => setDrawerOpen(true)} />
        </div>

        {/* Content Area - No margin offset when printing */}
        <main className="flex-1 p-8 mt-16 print:mt-0 print:p-0 overflow-y-auto">
          {renderPage()}
        </main>
      </div>

      {/* Notification Alerts Drawer - Hidden on print */}
      <div className="print:hidden">
        <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>

    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
