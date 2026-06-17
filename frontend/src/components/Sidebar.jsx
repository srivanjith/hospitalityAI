
import { 
  LayoutDashboard, 
  CalendarDays, 
  BrainCircuit, 
  Users, 
  FileSpreadsheet, 
  LogOut,
  UserCircle,
  BadgeIndianRupee,
  DatabaseZap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'occupancy', name: 'Bookings & Occupancy', icon: CalendarDays },
    { id: 'forecasting', name: 'AI Staffing Forecast', icon: BrainCircuit },
    { id: 'staff', name: 'Staff & Shift Registry', icon: Users },
    { id: 'costs', name: 'Work Details ', icon: BadgeIndianRupee },
    { id: 'reports', name: 'Analytical Reports', icon: FileSpreadsheet },
    ...(user?.role === 'admin' ? [{ id: 'seeder', name: 'AI Data Seeder', icon: DatabaseZap, adminOnly: true }] : [])
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-30">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2">
          <BrainCircuit className="h-7 w-7 text-luxury-gold" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-luxury-navy dark:text-white font-serif">
              Hospitality<span className="text-luxury-gold">AI</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Workforce Optimizer</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <div key={item.id}>
                {/* Divider before admin-only items */}
                {item.adminOnly && (
                  <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-1">
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-600 px-4 mb-1 font-semibold">Admin Tools</p>
                  </div>
                )}
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-luxury-navy to-[#1e293b] dark:from-luxury-darkCard dark:to-slate-800 text-luxury-gold shadow-md border-l-2 border-luxury-gold'
                      : item.adminOnly
                      ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-luxury-gold'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-luxury-gold' : item.adminOnly ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                  {item.adminOnly && !isActive && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-700/50">
                      Admin
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Session Box */}
      {user && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-luxury-darkCard/30">
          <div className="flex items-center space-x-3 mb-4">
            <UserCircle className="h-9 w-9 text-luxury-gold" />
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold truncate dark:text-white">{user.name}</h4>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-500/20' 
                    : user.role === 'guest'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-350 border border-emerald-500/20'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-slate-300 border border-slate-500/20'
                }`}>
                  {user.role === 'guest' ? 'Resident Guest' : user.role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border border-red-500/25 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout Session</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
