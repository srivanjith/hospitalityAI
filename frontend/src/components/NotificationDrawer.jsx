import React, { useRef, useEffect } from 'react';
import { X, Flame, AlertCircle, HelpCircle, Check, Settings } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const NotificationDrawer = ({ isOpen, onClose }) => {
  const { notifications, markAllAsRead } = useNotifications();
  const drawerRef = useRef(null);

  // Close when clicking outside drawer
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const getIcon = (type) => {
    switch (type) {
      case 'high-demand':
        return <Flame className="h-5 w-5 text-amber-500" />;
      case 'staffing':
        return <AlertCircle className="h-5 w-5 text-rose-500" />;
      case 'system':
        return <Settings className="h-5 w-5 text-sky-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getBorderColor = (type, read) => {
    if (read) return 'border-slate-200 dark:border-slate-800';
    switch (type) {
      case 'high-demand':
        return 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800 bg-amber-50/10 dark:bg-amber-900/5';
      case 'staffing':
        return 'border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800 bg-rose-50/10 dark:bg-rose-900/5';
      case 'system':
        return 'border-l-4 border-l-sky-500 border-slate-200 dark:border-slate-800 bg-sky-50/10 dark:bg-sky-900/5';
      default:
        return 'border-l-4 border-l-slate-400 border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <>
      {/* Dark overlay backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"></div>
      )}

      {/* Slide-out Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-screen w-96 glass-panel border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="h-5 w-5 text-luxury-gold animate-bounce" />
            <h3 className="text-lg font-semibold dark:text-white font-serif">Alert Center</h3>
          </div>
          <div className="flex items-center space-x-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-luxury-gold hover:text-luxury-goldDark font-semibold flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <Check className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Check className="h-10 w-10 text-emerald-500 mb-2 border border-emerald-500/25 p-2 rounded-full" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-455">All Operations Stable</p>
              <p className="text-xs text-slate-400">No active staffing warnings or alerts.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id || notif._id}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${getBorderColor(
                  notif.type,
                  notif.read
                )}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-200">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {notif.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
            HospitalityAI Core engine
          </p>
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
