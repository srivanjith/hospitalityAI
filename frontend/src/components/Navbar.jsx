import React from 'react';
import { Bell, Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useNotifications } from '../context/NotificationContext';

const Navbar = ({ pageTitle, toggleDrawer }) => {
  const { unreadCount } = useNotifications();

  return (
    <header className="fixed top-0 right-0 left-64 h-16 glass-panel border-b border-slate-200 dark:border-slate-800 z-20 flex items-center justify-between px-8">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold tracking-wide text-luxury-navy dark:text-white font-serif">
          {pageTitle}
        </h2>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggler */}
        <ThemeToggle />

        {/* Vertical Divider */}
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800"></div>

        {/* Notifications Icon */}
        <button
          onClick={toggleDrawer}
          className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 text-slate-600 dark:text-slate-400 hover:text-luxury-gold cursor-pointer"
          title="Notification Alerts"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white ring-2 ring-luxury-cream dark:ring-luxury-dark">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
