import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Utensils, 
  Waves, 
  Car, 
  Dumbbell, 
  ConciergeBell, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Users, 
  CheckCircle2, 
  LogOut, 
  Hotel,
  Clock,
  ArrowRight,
  Shield,
  Instagram,
  Facebook,
  Twitter,
  CalendarDays,
  Sparkles,
  Flame,
  X,
  Search,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { sendBookingConfirmationEmail } from '../services/emailService';

const GuestPortal = () => {
  const { user, logout } = useAuth();
  
  // Date and Reservation states
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [roomType, setRoomType] = useState('Standard Room');
  
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState([]);

  // Staff Report states
  const [reportName, setReportName] = useState(user?.name || '');
  const [reportRoomNo, setReportRoomNo] = useState('');
  const [reportStaffName, setReportStaffName] = useState('');
  const [reportService, setReportService] = useState('');
  const [reportSubmitSuccess, setReportSubmitSuccess] = useState(false);
  const [reportErrorMsg, setReportErrorMsg] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportErrorMsg(null);
    setReportSubmitSuccess(false);

    if (!reportName || !reportRoomNo || !reportStaffName || !reportService) {
      setReportErrorMsg('Please fill in all fields.');
      return;
    }

    setReportLoading(true);
    try {
      await api.submitStaffReport({
        guestName: reportName,
        roomNo: reportRoomNo,
        staffName: reportStaffName,
        service: reportService
      });
      setReportSubmitSuccess(true);
      setReportRoomNo('');
      setReportStaffName('');
      setReportService('');
    } catch (err) {
      setReportErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleReportCancel = () => {
    setReportRoomNo('');
    setReportStaffName('');
    setReportService('');
    setReportErrorMsg(null);
    setReportSubmitSuccess(false);
  };

  // Load guest's recent bookings
  const loadGuestBookings = async () => {
    try {
      const data = await api.getBookings();
      // Filter bookings by guest name (matches current logged in user name)
      const myBookings = data.filter(b => b.guestName.toLowerCase().includes(user.name.toLowerCase()) || b.guestName.toLowerCase() === user.name.toLowerCase());
      setRecentBookings(myBookings.slice(0, 3));
    } catch (err) {
      console.error('Error fetching guest bookings:', err);
    }
  };

  useEffect(() => {
    loadGuestBookings();
  }, [user, bookingSuccess]);

  const handleOpenBooking = (type) => {
    setRoomType(type);
    setShowBookModal(true);
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    // Scroll to rooms section
    const element = document.getElementById('rooms-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    if (checkInDate < today) {
      setErrorMsg('invalid date');
      setLoading(false);
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setErrorMsg('Check-out date must be after check-in date');
      setLoading(false);
      return;
    }

    try {
      const bookingRes = await api.addBooking({
        guestName: user.name,
        roomType,
        checkIn,
        checkOut,
        guestsCount: Number(guestsCount)
      });
      
      try {
        await sendBookingConfirmationEmail(user.email, bookingRes, user.name);
      } catch (emailErr) {
        console.error('Failed to send booking confirmation email:', emailErr);
      }

      setBookingSuccess(true);
      setCheckIn('');
      setCheckOut('');
      setGuestsCount(1);
      setTimeout(() => {
        setBookingSuccess(false);
        setShowBookModal(false);
      }, 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit reservation.');
    } finally {
      setLoading(false);
    }
  };

  // Rooms dataset
  const rooms = [
    {
      name: 'Standard Room',
      description: 'Cozy and sophisticated styling. Perfect for solo executives or short corporate stops.',
      price: 120,
      amenities: ['King Size Bed', 'Smart TV', 'Workspace', 'En-suite bath'],
      gradient: 'from-slate-700 to-slate-900'
    },
    {
      name: 'Deluxe Room',
      description: 'Spacious accommodation equipped with luxury oceanfront views and a personal balcony terrace.',
      price: 180,
      amenities: ['Ocean View balcony', 'Deep Soaking Tub', 'Espresso Station', 'Lounge Chair'],
      gradient: 'from-[#aa7c11] to-[#1e293b]'
    },
    {
      name: 'Executive Suite',
      description: 'Expanded layout featuring a private lounge partition, dedicated bar counter, and premier sights.',
      price: 280,
      amenities: ['Separate Lounge Area', 'Private Dry Bar', 'Panoramic Views', 'Priority Concierge'],
      gradient: 'from-luxury-navy to-[#131926]'
    },
    {
      name: 'Presidential Suite',
      description: 'The pinnacle of luxury. Absolute privacy across a full floor, private butler service, and jacuzzi deck.',
      price: 450,
      amenities: ['Full Floor Penthouse', 'Dedicated Butler', 'Private Roof Jacuzzi', 'Chef Kitchen'],
      gradient: 'from-[#0b0f19] via-[#aa7c11] to-[#0b0f19]'
    }
  ];

  // Testimonials
  const testimonials = [
    {
      quote: "The service at The Grand Royal Resort was absolute perfection. The attention to detail, oceanfront view, and immediate guest check-in parameters are outstanding.",
      author: "Charlotte H., VIP Guest"
    },
    {
      quote: "Simply the finest stay in Miami. The suites are exceptionally designed with curated styling, and the poolside services feel incredibly exclusive.",
      author: "Robert T., Business Ambassador"
    }
  ];

  return (
    <div className="min-h-screen bg-luxury-cream dark:bg-luxury-dark text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300 font-sans">
      
      {/* 1. Header Navigation */}
      <header className="fixed top-0 left-0 right-0 h-20 glass-panel border-b border-slate-200/50 dark:border-slate-800/50 z-40 flex items-center justify-between px-8 sm:px-16">
        {/* Brand Logo */}
        <div className="flex items-center space-x-2">
          <Hotel className="h-6 w-6 text-luxury-gold" />
          <div>
            <h1 className="text-lg font-bold tracking-wider font-serif text-luxury-navy dark:text-white leading-none">
              THE GRAND ROYAL
            </h1>
            <span className="text-[9px] uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold">Miami resort</span>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider">
          <a href="#home" className="hover:text-luxury-gold transition-colors">Home</a>
          <a href="#rooms-section" className="hover:text-luxury-gold transition-colors">Rooms</a>
          <a href="#facilities-section" className="hover:text-luxury-gold transition-colors">Facilities</a>
          <a href="#gallery-section" className="hover:text-luxury-gold transition-colors">Gallery</a>
          <a href="#contact-section" className="hover:text-luxury-gold transition-colors">Contact</a>
        </nav>

        {/* User profile & logout */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right">
            <span className="text-xs text-slate-400 block font-medium">Signed in as</span>
            <span className="text-xs font-bold text-luxury-navy dark:text-white">{user.name}</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-850"></div>
          <button
            onClick={logout}
            className="p-2 rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Hero Full-Screen Banner */}
      <section id="home" className="relative h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Custom Visual Gradient Backdrop simulating a luxury hotel suite */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0f19] via-[#0f172a] to-[#251f14] z-0"></div>
        {/* Abstract Room Design Element */}
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-luxury-gold/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-[#aa7c11]/5 blur-[120px] pointer-events-none"></div>
        
        {/* Hero Content Overlay */}
        <div className="relative z-10 text-center max-w-4xl px-6 space-y-6 animate-fade-in mt-12">
          {/* Rating */}
          <div className="flex items-center justify-center space-x-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="h-4 w-4 text-luxury-gold fill-luxury-gold" />
            ))}
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold font-serif text-white leading-tight tracking-wide">
            Experience True Luxury
          </h2>
          
          <p className="text-md md:text-lg text-luxury-goldLight font-medium tracking-widest font-mono uppercase">
            Your Golden Haven in Miami
          </p>
          
          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
            Escape to an oceanfront sanctuary of unparalleled comfort. Curated gourmet dining, exclusive wellness spas, and gold-standard personal service await your arrival.
          </p>

          <div className="pt-4">
            <a 
              href="#rooms-section" 
              className="btn-gold px-8 py-3 text-sm tracking-widest uppercase font-bold flex items-center justify-center space-x-2 inline-flex"
            >
              <span>Explore Accommodations</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-slate-400 text-xs tracking-widest uppercase flex flex-col items-center space-y-1">
          <span className="animate-bounce">↓</span>
          <span>Scroll Down</span>
        </div>
      </section>

      {/* 3. Availability Quick Search Bar */}
      <section className="relative z-20 max-w-5xl w-full mx-auto px-6 -mt-16">
        <form onSubmit={handleQuickSearch} className="glass-panel p-6 rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Check-In */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arrival Date</label>
            <div className="flex items-center space-x-2 bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5">
              <Calendar className="h-4 w-4 text-luxury-gold" />
              <input
                type="date"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-white focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Check-Out */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Departure Date</label>
            <div className="flex items-center space-x-2 bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5">
              <Calendar className="h-4 w-4 text-luxury-gold" />
              <input
                type="date"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-white focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Guests Count */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Guests</label>
            <div className="flex items-center space-x-2 bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5">
              <Users className="h-4 w-4 text-luxury-gold" />
              <input
                type="number"
                min="1"
                max="6"
                required
                value={guestsCount}
                onChange={(e) => setGuestsCount(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-700 dark:text-white focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Search Action */}
          <div>
            <button
              type="submit"
              className="w-full btn-gold py-3 text-xs tracking-wider uppercase font-bold flex items-center justify-center space-x-1.5"
            >
              <Search className="h-4 w-4" />
              <span>Search Rates</span>
            </button>
          </div>
        </form>
      </section>

      {/* 4. Hotel Introduction & General Details */}
      <section className="py-20 px-8 sm:px-16 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-luxury-gold" />
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Ocean Drive, Miami, FL</span>
          </div>
          
          <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white leading-tight">
            An Uncompromising Sanctuary of Coastal Comfort
          </h3>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ideally situated along the pristine shores of Miami Beach, The Grand Royal Resort harmonizes structural elegance with premium hospitality parameters. Designed for global travelers, we provide an oasis of absolute calm, privacy, and state-of-the-art conveniences.
          </p>

          {/* Metadata details table */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
            <div className="flex items-center space-x-2">
              <Clock className="h-4.5 w-4.5 text-luxury-gold" />
              <div>
                <span className="font-semibold block dark:text-white">Check-In Time</span>
                <span className="text-slate-400">ANY TIME </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4.5 w-4.5 text-luxury-gold" />
              <div>
                <span className="font-semibold block dark:text-white">Check-Out Time</span>
                <span className="text-slate-400">ANY TIME </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-4.5 w-4.5 text-luxury-gold" />
              <div>
                <span className="font-semibold block dark:text-white">Call Support</span>
                <span className="text-slate-400">91+ 9666666884</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-4.5 w-4.5 text-luxury-gold" />
              <div>
                <span className="font-semibold block dark:text-white">Email Desk</span>
                <span className="text-slate-400">desk@grandroyal.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Luxury Aspect card decoration */}
        <div className="bg-gradient-to-br from-luxury-navy to-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6 relative overflow-hidden flex flex-col justify-center h-80">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-luxury-gold/5 blur-[50px] pointer-events-none"></div>
          <div className="inline-flex justify-center p-3 bg-luxury-gold/10 border border-luxury-gold/25 rounded-full mx-auto">
            <Shield className="h-6 w-6 text-luxury-gold" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold text-white">Curated Resort Experience</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              We leverage real-time occupancy monitoring and automated workflows to ensure guest suites are pre-warmed, fully prepped, and staff are responsive 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Recent Bookings Drawer for the logged in guest */}
      {recentBookings.length > 0 && (
        <section className="py-8 px-8 sm:px-16 bg-slate-50 dark:bg-luxury-darkCard/25 border-y border-slate-200/50 dark:border-slate-800/50">
          <div className="max-w-6xl mx-auto space-y-4">
            <h4 className="font-serif text-md font-bold dark:text-white flex items-center space-x-2">
              <CalendarDays className="h-4 w-4 text-luxury-gold" />
              <span>Your Upcoming Stays</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentBookings.map((b) => (
                <div key={b.id || b._id} className="p-4 bg-white dark:bg-luxury-darkCard border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-bold block dark:text-white">{b.roomType}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Featured Room Types with booking buttons */}
      <section id="rooms-section" className="py-20 px-8 sm:px-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold">Featured Suites</span>
          <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">Curated Accommodations</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">Select your layout suite. All rooms feature elegant aesthetics, high-speed Wi-Fi, and 24/7 personal room service.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {rooms.map((room) => (
            <div 
              key={room.name} 
              className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between"
            >
              {/* Image box representation with luxury gradients */}
              <div className={`h-48 bg-gradient-to-r ${room.gradient} p-6 flex flex-col justify-between text-white relative`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10 flex justify-between items-start">
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full">
                    Luxury Standard
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-serif font-bold text-luxury-gold">₹{room.price}</span>
                    <span className="text-[10px] text-slate-350 block">/ DAY</span>
                  </div>
                </div>
                <h4 className="relative z-10 font-serif text-xl font-bold tracking-wide">{room.name}</h4>
              </div>

              {/* Card Details */}
              <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {room.description}
                  </p>
                  
                  {/* Amenities */}
                  <div className="grid grid-cols-2 gap-2">
                    {room.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                        <CheckCircle2 className="h-3.5 w-3.5 text-luxury-gold" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
                  <button
                    onClick={() => handleOpenBooking(room.name)}
                    className="w-full btn-gold text-xs py-2.5 uppercase tracking-wider font-bold"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Hotel Facilities Section */}
      <section id="facilities-section" className="py-20 bg-slate-50 dark:bg-luxury-darkCard/20 border-y border-slate-200/50 dark:border-slate-800/50 px-8 sm:px-16">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold font-mono">Resort Experience</span>
            <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">Hotel Facilities</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">Providing gold-standard physical amenities for a restorative getaway experience.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            {/* Wi-Fi */}
            <div className="p-5 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-2xl text-center space-y-3 shadow-sm hover:-translate-y-1 duration-200 transition-transform">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Wifi className="h-5 w-5 text-luxury-gold" />
              </div>
              <h5 className="text-xs font-bold dark:text-white uppercase tracking-wider">Free Wi-Fi</h5>
            </div>

            {/* Restaurant */}
            <div className="p-5 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-2xl text-center space-y-3 shadow-sm hover:-translate-y-1 duration-200 transition-transform">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Utensils className="h-5 w-5 text-luxury-gold" />
              </div>
              <h5 className="text-xs font-bold dark:text-white uppercase tracking-wider">Fine Dining</h5>
            </div>

            {/* Swimming Pool */}
            <div className="p-5 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-2xl text-center space-y-3 shadow-sm hover:-translate-y-1 duration-200 transition-transform">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Waves className="h-5 w-5 text-luxury-gold" />
              </div>
              <h5 className="text-xs font-bold dark:text-white uppercase tracking-wider">Outdoor Pool</h5>
            </div>

            {/* Parking */}
            <div className="p-5 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-2xl text-center space-y-3 shadow-sm hover:-translate-y-1 duration-200 transition-transform">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Car className="h-5 w-5 text-luxury-gold" />
              </div>
              <h5 className="text-xs font-bold dark:text-white uppercase tracking-wider">Free Parking</h5>
            </div>

            {/* Gym */}
            <div className="p-5 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-2xl text-center space-y-3 shadow-sm hover:-translate-y-1 duration-200 transition-transform">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Dumbbell className="h-5 w-5 text-luxury-gold" />
              </div>
              <h5 className="text-xs font-bold dark:text-white uppercase tracking-wider">Fitness Center</h5>
            </div>

            {/* Room Service */}
            <div className="p-5 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-2xl text-center space-y-3 shadow-sm hover:-translate-y-1 duration-200 transition-transform">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <ConciergeBell className="h-5 w-5 text-luxury-gold" />
              </div>
              <h5 className="text-xs font-bold dark:text-white uppercase tracking-wider">Room Service</h5>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Photo Gallery Grid */}
      <section id="gallery-section" className="py-20 px-8 sm:px-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold">Visual Splendor</span>
          <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">Resort Photo Gallery</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">Explore snapshots of our coastal Miami property.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Lobby */}
          <div className="h-64 bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-end text-white shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-[#0f172a]/20 group-hover:scale-105 duration-350 transition-transform"></div>
            <div className="relative z-10">
              <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">Arrival lobby</span>
              <h4 className="font-serif text-md font-bold mt-1">Gilded Reception Hall</h4>
            </div>
          </div>

          {/* Dining */}
          <div className="h-64 bg-gradient-to-br from-[#aa7c11] to-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-end text-white shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-[#0f172a]/20 group-hover:scale-105 duration-350 transition-transform"></div>
            <div className="relative z-10">
              <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">Gastronomy</span>
              <h4 className="font-serif text-md font-bold mt-1">Signature Dining Salon</h4>
            </div>
          </div>

          {/* Pool */}
          <div className="h-64 bg-gradient-to-br from-[#0f172a] to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-end text-white shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-[#0f172a]/20 group-hover:scale-105 duration-350 transition-transform"></div>
            <div className="relative z-10">
              <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">Poolside spa</span>
              <h4 className="font-serif text-md font-bold mt-1">Golden Hour Infinity Pool</h4>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Reviews & Testimonials */}
      <section className="py-20 bg-gradient-to-br from-luxury-navy to-[#1e293b] border-t border-slate-800 text-white px-8 sm:px-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs uppercase tracking-widest text-luxury-gold font-bold font-mono">Testimonials</span>
            <h3 className="text-3xl font-serif font-bold text-white">Guest Reviews</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-luxury-darkCard/50 border border-slate-800/80 p-6 rounded-2xl space-y-4 relative">
                <div className="flex text-luxury-gold space-x-0.5">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-luxury-gold text-luxury-gold" />)}
                </div>
                <p className="text-xs italic text-slate-300 leading-relaxed font-serif">
                  "{t.quote}"
                </p>
                <div className="text-[10px] font-bold uppercase tracking-wider text-luxury-goldDark">
                  — {t.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Map Grid */}
      <section id="contact-section" className="py-20 px-8 sm:px-16 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Contact info card */}
        <div className="space-y-6">
          <h3 className="text-3xl font-serif font-bold dark:text-white">Location & Contact</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Our luxury property is situated directly on the iconic strip of Miami Beach, offering immediate beach access and easy transit routes. Let us know if you require personal chauffeur coordination.
          </p>
          <div className="space-y-3 text-xs">
            <div className="flex items-center space-x-3">
              <MapPin className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="dark:text-slate-300 font-medium">SATHY,ERODE</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="dark:text-slate-300 font-medium">91+ 9666666884</span>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="dark:text-slate-300 font-medium">reservations@grandroyal.com</span>
            </div>
          </div>
        </div>

        {/* Location Map visual panel */}
        <div className="bg-slate-100 dark:bg-luxury-darkCard border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-64 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[#aa7c11]/5 blur-[60px] pointer-events-none"></div>
          <div>
            <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold block mb-1">Miami beach coordinates</span>
            <span className="text-xs font-bold block dark:text-white">Latitude: 25.7781° N | Longitude: 80.1313° W</span>
          </div>
          {/* Mock vector map visual representation */}
          <div className="border border-dashed border-slate-300 dark:border-slate-850 p-4 rounded-xl flex-1 mt-4 flex items-center justify-center text-[10px] text-slate-450 bg-slate-50/50 dark:bg-luxury-dark/40 font-mono">
            <Compass className="h-6 w-6 text-luxury-gold mr-2 animate-spin-slow" />
            <span>Interactive Map Vector Overlay (Miami Shoreline)</span>
          </div>
        </div>
      </section>

      {/* 10. Report Staff Section */}
      <section className="max-w-6xl mx-auto py-12 px-8 sm:px-16 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
        <div className="bg-gradient-to-br from-luxury-navy to-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-luxury-gold/5 blur-[50px] pointer-events-none"></div>
          
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold block mb-1">Service Quality Control</span>
              <h2 className="text-2xl font-bold font-serif text-white tracking-wide">Report Staff Member</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Help us maintain our 5-star service standards. If you experienced any issues with our staff or services, please file a report below.
              </p>
            </div>

            {reportSubmitSuccess && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs text-center mb-6">
                Report submitted successfully! The quality control team will investigate this incident.
              </div>
            )}

            {reportErrorMsg && (
              <div className="p-4 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs text-center mb-6">
                {reportErrorMsg}
              </div>
            )}

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Guest Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Name</label>
                  <input
                    type="text"
                    required
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                  />
                </div>

                {/* Room Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Number</label>
                  <input
                    type="text"
                    required
                    value={reportRoomNo}
                    onChange={(e) => setReportRoomNo(e.target.value)}
                    placeholder="e.g. 302"
                    className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff Member Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Member Name</label>
                  <input
                    type="text"
                    required
                    value={reportStaffName}
                    onChange={(e) => setReportStaffName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                  />
                </div>

                {/* Service Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Department</label>
                  <input
                    type="text"
                    required
                    value={reportService}
                    onChange={(e) => setReportService(e.target.value)}
                    placeholder="e.g. Housekeeping"
                    className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleReportCancel}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportLoading}
                  className="px-6 py-2 bg-gradient-to-r from-luxury-gold to-luxury-goldDark text-luxury-navy hover:shadow-lg font-bold rounded-lg text-xs transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {reportLoading ? 'Filing Report...' : 'File Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="bg-luxury-navy text-slate-400 py-12 border-t border-slate-800 text-xs px-8 sm:px-16 text-center md:text-left">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <Hotel className="h-5 w-5 text-luxury-gold" />
              <h4 className="text-md font-serif font-bold text-white tracking-wide">THE GRAND ROYAL</h4>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Providing modern guest comfort metrics alongside state-of-the-art hotel staffing optimization systems.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white tracking-wider uppercase text-[10px]">Reservations</h5>
            <p className="text-[11px]">+1 04352648488384</p>
            <p className="text-[11px]">inquiries@grandroyal.com</p>
          </div>

          <div className="space-y-4">
            <h5 className="font-bold text-white tracking-wider uppercase text-[10px]">Follow Our Luxury Journey</h5>
            <div className="flex justify-center md:justify-start space-x-4">
              <a href="#" className="hover:text-luxury-gold"><Facebook className="h-4.5 w-4.5" /></a>
              <a href="#" className="hover:text-luxury-gold"><Twitter className="h-4.5 w-4.5" /></a>
              <a href="#" className="hover:text-luxury-gold"><Instagram className="h-4.5 w-4.5" /></a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 text-center text-[10px] text-slate-650">
          © {new Date().getFullYear()} The Grand Royal Resort. Powered by HospitalityAI predictive staffing engine. All rights reserved.
        </div>
      </footer>

      {/* 12. Book Now Action Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-luxury-cream dark:bg-luxury-darkCard border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-fade-in relative">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-luxury-navy text-luxury-gold dark:bg-luxury-darkCard">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-luxury-gold" />
                <h3 className="text-md font-bold font-serif text-white">Book: {roomType}</h3>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            {bookingSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500">
                  <CheckCircle2 className="h-8 w-8 animate-bounce" />
                </div>
                <h4 className="font-serif text-lg font-bold dark:text-white">Reservation Confirmed!</h4>
                <p className="text-xs text-slate-400">
                  Your stay has been recorded in our ledger. Thank you for choosing The Grand Royal.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Guest Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Guest</label>
                    <input
                      type="text"
                      disabled
                      value={user.name}
                      className="w-full bg-slate-100 dark:bg-luxury-dark border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Check In Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Check In Date</label>
                      <input
                        type="date"
                        required
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Check Out Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Check Out Date</label>
                      <input
                        type="date"
                        required
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Guests Count */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Guests Count</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      required
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(e.target.value)}
                      className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowBookModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold text-xs cursor-pointer"
                  >
                    {loading ? 'Securing Room...' : 'Confirm Stay'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default GuestPortal;
