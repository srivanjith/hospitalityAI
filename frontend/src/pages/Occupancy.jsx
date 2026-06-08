import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  CalendarDays, 
  UserPlus, 
  Sparkles,
  TrendingUp,
  X,
  CheckCircle2,
  Trash2,
  AlertOctagon
} from 'lucide-react';
import api from '../services/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Occupancy = () => {
  const [bookings, setBookings] = useState([]);
  const [occupancyHistory, setOccupancyHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [guestName, setGuestName] = useState('');
  const [roomType, setRoomType] = useState('Standard Room');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [formError, setFormError] = useState(null);

  const loadOccupancyData = async () => {
    try {
      setLoading(true);
      const bookingsData = await api.getBookings();
      setBookings(bookingsData);
      
      const historyData = await api.getOccupancyAnalytics(30);
      setOccupancyHistory(historyData.chartData || []);
    } catch (err) {
      console.error('Error loading occupancy records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOccupancyData();
  }, []);

  const handleAddBooking = async (e) => {
    e.preventDefault();
    setFormError(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    if (checkInDate < today) {
      setFormError('invalid date');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setFormError('Check-out date must be after check-in date');
      return;
    }

    try {
      await api.addBooking({
        guestName,
        roomType,
        checkIn,
        checkOut,
        guestsCount: Number(guestsCount)
      });
      
      // Reset form
      setGuestName('');
      setRoomType('Standard Room');
      setCheckIn('');
      setCheckOut('');
      setGuestsCount(1);
      setShowAddModal(false);
      
      // Reload lists and graphs
      await loadOccupancyData();
    } catch (err) {
      setFormError(err.message || 'Failed to record reservation');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateBookingStatus(id, status);
      await loadOccupancyData();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // 30-Day Bar chart setup
  const barChartData = {
    labels: occupancyHistory.map(h => {
      const parts = h.date.split('-');
      return `${parts[1]}/${parts[2]}`; // MM/DD format
    }),
    datasets: [
      {
        label: 'Occupancy Rate %',
        data: occupancyHistory.map(h => h.occupancyPercentage),
        backgroundColor: occupancyHistory.map(h => 
          h.occupancyPercentage >= 85 
            ? 'rgba(212, 175, 55, 0.85)' // Glow gold for full house
            : 'rgba(30, 41, 59, 0.65)'  // Navy slate for standard occupancy
        ),
        borderColor: 'rgba(212, 175, 55, 0.1)',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#131926',
        titleFont: { family: 'Playfair Display' },
        bodyFont: { family: 'Inter' },
        callbacks: {
          label: (context) => ` Occupancy: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#64748b', font: { size: 9 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 8 } }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-gold mx-auto"></div>
          <p className="text-sm text-slate-500 font-mono">Syncing Reservation Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Analytics Visual Graph */}
      <div className="glass-panel p-6 rounded-2xl shadow-glass">
        <div className="mb-4">
          <h3 className="text-lg font-bold font-serif dark:text-white">30-Day Occupancy History Analytics</h3>
          <p className="text-xs text-slate-400">Daily occupancy percentage logging. Gold highlights indicate occupancy exceeding 85%.</p>
        </div>
        <div className="h-56 relative">
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* 2. Bookings Table */}
      <div className="glass-panel rounded-2xl shadow-glass overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-serif dark:text-white">Active Guest Ledger</h3>
            <p className="text-xs text-slate-400">Real-time listing of guest reservation files and stay status updates</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gold flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Reservation</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-luxury-header text-xs">Guest Name</th>
                <th className="table-luxury-header text-xs">Room Choice</th>
                <th className="table-luxury-header text-xs">Check In</th>
                <th className="table-luxury-header text-xs">Check Out</th>
                <th className="table-luxury-header text-xs text-center">Guests</th>
                <th className="table-luxury-header text-xs text-right">Revenue</th>
                <th className="table-luxury-header text-xs text-center">Status</th>
                <th className="table-luxury-header text-xs text-center">Operations</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-sm text-slate-450">
                    No bookings logged in the system.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id || booking._id} className="table-luxury-row">
                    <td className="py-4 px-4 text-xs font-semibold dark:text-white">
                      {booking.guestName}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {booking.roomType}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 font-mono">
                      {new Date(booking.checkIn).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 font-mono">
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-xs text-center font-semibold text-slate-600 dark:text-slate-400">
                      {booking.guestsCount}
                    </td>
                    <td className="py-4 px-4 text-xs text-right font-bold text-emerald-600 dark:text-emerald-455 font-mono">
                      ₹{booking.revenue?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 px-4 text-xs text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                        booking.status === 'booked' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300' :
                        booking.status === 'checked-in' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300' :
                        booking.status === 'checked-out' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400' :
                        'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-350'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {booking.status === 'booked' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking.id || booking._id, 'checked-in')}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 hover:underline cursor-pointer"
                            >
                              Check In
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleStatusChange(booking.id || booking._id, 'cancelled')}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-455 hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {booking.status === 'checked-in' && (
                          <button
                            onClick={() => handleStatusChange(booking.id || booking._id, 'checked-out')}
                            className="text-[10px] font-bold text-sky-650 hover:text-sky-500 hover:underline cursor-pointer"
                          >
                            Check Out
                          </button>
                        )}
                        {booking.status === 'checked-out' && (
                          <span className="text-[10px] text-slate-400 font-medium">Completed</span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span className="text-[10px] text-red-400 font-medium">Reclaimed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Add Reservation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-luxury-cream dark:bg-luxury-darkCard border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-luxury-navy text-luxury-gold dark:bg-luxury-darkCard">
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-luxury-gold" />
                <h3 className="text-lg font-bold font-serif text-white">Create Reservation File</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddBooking} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center space-x-2">
                  <AlertOctagon className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Guest Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guest Name</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="E.g. Alexander Hamilton"
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:border-luxury-gold focus:outline-none"
                  />
                </div>

                {/* Room Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Room Class</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:border-luxury-gold focus:outline-none"
                  >
                    <option value="Standard Room">Standard Room (₹120/nt)</option>
                    <option value="Deluxe Room">Deluxe Room (₹180/nt)</option>
                    <option value="Executive Suite">Executive Suite (₹280/nt)</option>
                    <option value="Presidential Suite">Presidential Suite (₹450/nt)</option>
                  </select>
                </div>

                {/* Check In Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check In Date</label>
                  <input
                    type="date"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:border-luxury-gold focus:outline-none"
                  />
                </div>

                {/* Check Out Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check Out Date</label>
                  <input
                    type="date"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:border-luxury-gold focus:outline-none"
                  />
                </div>

                {/* Guests Count */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number of Guests</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(e.target.value)}
                    className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:border-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="btn-gold text-xs cursor-pointer"
                >
                  File Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Occupancy;
