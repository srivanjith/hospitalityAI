import { useState, useEffect, useCallback } from 'react';
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
  CalendarDays,
  X,
  Search,
  Compass,
  Bed,
  User,
  Info,
  AlertTriangle
} from 'lucide-react';
import { FaInstagram, FaFacebook } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { sendBookingConfirmationEmail } from '../services/emailService';

const facilityCategories = [
  {
    id: 'popular',
    name: 'Most Popular',
    icon: Star,
    items: [
      { name: 'Outdoor swimming pool', badge: 'Free' },
      { name: 'Free WiFi' },
      { name: 'Free parking' },
      { name: 'Airport shuttle', badge: 'Additional charge' },
      { name: 'Family rooms' },
      { name: 'Spa and wellness centre', badge: 'Additional charge' },
      { name: 'Fitness centre' },
      { name: '4 restaurants' },
      { name: 'Bar' },
      { name: 'Very Good Breakfast' }
    ]
  },
  {
    id: 'wellness',
    name: 'Wellness & Pools',
    icon: Waves,
    items: [
      { name: 'Kids\' pool' },
      { name: 'Personal trainer & Fitness' },
      { name: 'Spa/wellness packages' },
      { name: 'Foot bath & Steam room' },
      { name: 'Spa lounge/relaxation area' },
      { name: 'Body wrap & scrub' },
      { name: 'Beauty & Hair services' },
      { name: 'Hot tub & Jacuzzi', badge: 'Additional charge' },
      { name: 'Massage therapies', badge: 'Additional charge' },
      { name: 'Sauna facilities', badge: 'Additional charge' }
    ]
  },
  {
    id: 'dining',
    name: 'Food & Drink',
    icon: Utensils,
    items: [
      { name: '4 Restaurants & On-site Bar' },
      { name: 'Coffee house on site' },
      { name: 'Breakfast in the room / Buffet' },
      { name: 'Kid-friendly buffet & Kids\' meals' },
      { name: 'Special diet menus (on request)' },
      { name: 'Fruits & Wine/Champagne', badge: 'Additional charge' }
    ]
  },
  {
    id: 'reception',
    name: 'Services & Business',
    icon: ConciergeBell,
    items: [
      { name: '24-hour Front Desk' },
      { name: 'Express Check-In/Check-Out' },
      { name: 'Concierge & Luggage Storage' },
      { name: 'Tour Desk & Currency Exchange' },
      { name: 'Invoice provided' },
      { name: 'Daily Housekeeping' },
      { name: 'Laundry, Dry Cleaning & Ironing', badge: 'Additional charge' },
      { name: 'Meeting, Banquet & Business centre', badge: 'Additional charge' }
    ]
  },
  {
    id: 'room',
    name: 'Room & General',
    icon: Hotel,
    items: [
      { name: 'Air conditioning & Soundproofing' },
      { name: 'Lift & Central Heating' },
      { name: 'Ironing & Room service' },
      { name: 'Tumble dryer & Clothes rack' },
      { name: 'Fold-up bed & Sofa' },
      { name: 'Desk / Workspace' },
      { name: 'Valet parking' },
      { name: 'Bicycle rental & Happy hour', badge: 'Additional charge' }
    ]
  },
  {
    id: 'safety',
    name: 'Security & Languages',
    icon: Shield,
    items: [
      { name: '24-hour Security & Key card access' },
      { name: 'CCTV in common areas' },
      { name: 'Security Alarm & Safety deposit box' },
      { name: 'Fire extinguishers' },
      { name: 'Languages spoken: English, Hindi, Tamil' }
    ]
  }
];

const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'rooms-section', label: 'Rooms' },
  { id: 'facilities-section', label: 'Facilities' },
  { id: 'rules-section', label: 'Rules' },
  { id: 'gallery-section', label: 'Gallery' },
  { id: 'contact-section', label: 'Contact' }
];

const GuestPortal = () => {
  const { user, logout, updateProfile } = useAuth();

  // Scroll & Active Section States
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('none');
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    let lastY = window.scrollY;
    const threshold = 8;

    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrollY(currentY);

      // Determine scroll direction with threshold to prevent toggle flickering
      const difference = currentY - lastY;
      if (Math.abs(difference) > threshold) {
        if (difference > 0) {
          setScrollDirection('down');
        } else {
          setScrollDirection('up');
        }
        lastY = currentY;
      }

      // Track active section
      const sections = ['home', 'rooms-section', 'facilities-section', 'rules-section', 'gallery-section', 'contact-section'];
      let currentSection = 'home';
      
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            currentSection = section;
            break;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Profile View States
  const [viewMode, setViewMode] = useState('portal'); // 'portal' | 'profile'
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileRoomPref, setProfileRoomPref] = useState('Standard Room');
  const [profileSpecialReq, setProfileSpecialReq] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileState, setProfileState] = useState('');
  const [profileCountry, setProfileCountry] = useState('');
  const [profilePincode, setProfilePincode] = useState('');
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState(null);
  const [activeProfileTab, setActiveProfileTab] = useState('personal'); // 'personal' | 'preferences'
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (viewMode !== 'profile') {
      setIsEditing(false);
    }
  }, [viewMode]);

  useEffect(() => {
    setIsEditing(false);
  }, [activeProfileTab]);

  // Load profile details from database
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const profile = await api.getProfile();
        setProfilePhone(profile.phone || '');
        setProfileAddress(profile.address || '');
        setProfileRoomPref(profile.preferredRoom || 'Standard Room');
        setProfileSpecialReq(profile.specialRequests || '');
        setProfilePicture(profile.profilePicture || '');
        setProfileGender(profile.gender || '');
        setProfileDob(profile.dob || '');
        setProfileCity(profile.city || '');
        setProfileState(profile.state || '');
        setProfileCountry(profile.country || '');
        setProfilePincode(profile.pincode || '');
      } catch (err) {
        console.error('Failed to load profile details:', err);
      }
    };
    if (user) {
      fetchProfileData();
    }
  }, [user, viewMode]);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 200 * 1024) { // 200KB limit
        setProfileErrorMsg('Image size must be less than 200KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelEdit = async () => {
    setIsEditing(false);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    try {
      const profile = await api.getProfile();
      setProfilePhone(profile.phone || '');
      setProfileAddress(profile.address || '');
      setProfileRoomPref(profile.preferredRoom || 'Standard Room');
      setProfileSpecialReq(profile.specialRequests || '');
      setProfilePicture(profile.profilePicture || '');
      setProfileGender(profile.gender || '');
      setProfileDob(profile.dob || '');
      setProfileCity(profile.city || '');
      setProfileState(profile.state || '');
      setProfileCountry(profile.country || '');
      setProfilePincode(profile.pincode || '');
    } catch (err) {
      console.error('Failed to load profile details on cancel:', err);
    }
  };
  
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [guestsCount, setGuestsCount] = useState(1);
  const [roomType, setRoomType] = useState('Standard Room');
  
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState([]);
  const [activeFacilityCategory, setActiveFacilityCategory] = useState('popular');
  const [activeRoomCategory, setActiveRoomCategory] = useState('All');
  const [selectedRoomShowcase, setSelectedRoomShowcase] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedCategoryPage, setSelectedCategoryPage] = useState(null); // null | 'Standard' | 'Executive' | 'Luxury'
  const [bookingStep, setBookingStep] = useState('details'); // 'details' | 'payment' | 'card_details'
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const calculateTotalCost = () => {
    if (!checkIn || !checkOut) return 0;
    const days = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 0;
    
    const roomObj = rooms.find(r => r.name === roomType) || { price: 120 };
    return roomObj.price * days;
  };

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

  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState('Overall Stay');
  const [feedbackRoomNo, setFeedbackRoomNo] = useState('');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitSuccess, setFeedbackSubmitSuccess] = useState(false);
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackErrorMsg(null);
    setFeedbackSubmitSuccess(false);

    if (!feedbackRoomNo || !feedbackComments) {
      setFeedbackErrorMsg('Please fill in all required fields.');
      return;
    }

    setFeedbackLoading(true);
    try {
      await api.submitFeedback({
        guestName: user.name,
        roomNo: feedbackRoomNo,
        category: feedbackCategory,
        rating: Number(feedbackRating),
        comments: feedbackComments
      });
      setFeedbackSubmitSuccess(true);
      setFeedbackRoomNo('');
      setFeedbackComments('');
      setFeedbackRating(5);
      setFeedbackCategory('Overall Stay');
    } catch (err) {
      setFeedbackErrorMsg(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFeedbackCancel = () => {
    setFeedbackRoomNo('');
    setFeedbackComments('');
    setFeedbackRating(5);
    setFeedbackCategory('Overall Stay');
    setFeedbackErrorMsg(null);
    setFeedbackSubmitSuccess(false);
  };

  // Load guest's recent bookings
  const loadGuestBookings = useCallback(async () => {
    try {
      const data = await api.getBookings();
      // Filter bookings by guest name (matches current logged in user name)
      const myBookings = data.filter(b => b.guestName.toLowerCase().includes(user.name.toLowerCase()) || b.guestName.toLowerCase() === user.name.toLowerCase());
      setRecentBookings(myBookings.slice(0, 3));
    } catch (err) {
      console.error('Error fetching guest bookings:', err);
    }
  }, [user.name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadGuestBookings();
    }, 0);
    return () => clearTimeout(timer);
  }, [bookingSuccess, loadGuestBookings]);

  useEffect(() => {
    setActiveImageIdx(0);
    if (selectedRoomShowcase) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedRoomShowcase]);

  const handleOpenBooking = (type) => {
    setRoomType(type);
    setShowBookModal(true);
    setBookingStep('details');
    setErrorMsg(null);
    setCardholderName(user.name);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCheckInTime('14:00');
    setCheckOutTime('12:00');
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    // Scroll to rooms section
    const element = document.getElementById('rooms-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleValidateDetails = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    if (checkInDate < today) {
      setErrorMsg('Arrival date cannot be in the past');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setErrorMsg('Departure date must be after arrival date');
      return;
    }

    setBookingStep('payment');
  };

  const handleCompleteBooking = async (method, e) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const bookingRes = await api.addBooking({
        guestName: user.name,
        roomType,
        checkIn,
        checkOut,
        checkInTime,
        checkOutTime,
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
        setBookingStep('details');
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
      name: 'Guest room, 1 King, City view, Atrium Building, Pool access',
      description: 'Sophisticated guest room in our main Atrium building featuring a plush King bed and direct pool access.',
      price: 120,
      amenities: ['1 King Bed', 'City View', 'Atrium Building', 'Pool Access'],
      gradient: 'from-slate-700 to-slate-900',
      bedText: '1 king bed',
      guestsLayout: '3+1',
      category: 'Standard',
      image: '/room_standard_1.png'
    },
    {
      name: 'Guest room, 2 Queen or 2 Twin/Single Bed(s), City view',
      description: 'Comfortable layout containing two Twin or Queen beds, matching modern design lines with city views.',
      price: 140,
      amenities: ['2 Twin / Queen Beds', 'City View', 'Workspace', 'En-suite bath'],
      gradient: 'from-slate-800 to-slate-955',
      bedText: '2 twin beds',
      guestsLayout: '3',
      category: 'Standard',
      image: '/room_standard_2.png'
    },
    {
      name: 'Concierge level, Guest room, 1 King, City view, Corner room',
      description: 'Spacious corner room positioning on the concierge floor, offering extra comfort parameters and VIP access.',
      price: 160,
      amenities: ['1 King Bed', 'Concierge Level Access', 'Corner Room Space', 'City View'],
      gradient: 'from-[#805e0c] to-[#1a2333]',
      bedText: '1 king bed',
      guestsLayout: '3',
      category: 'Executive',
      image: '/room_executive_1.png'
    },
    {
      name: 'Club lounge access, Guest room, 2 Twin/Single Bed(s)',
      description: 'Enjoy dedicated access to our private Club Lounge, featuring all-day premium refreshments and drinks.',
      price: 180,
      amenities: ['2 Twin Beds', 'Club Lounge Access', 'Gourmet Buffet', 'Desk Area'],
      gradient: 'from-[#aa7c11] to-[#1e293b]',
      bedText: '2 twin beds',
      guestsLayout: '3',
      category: 'Standard',
      image: '/room_standard_3.png'
    },
    {
      name: 'Club lounge access, 1 Bedroom Junior Suite, 1 King',
      description: 'Sophisticated junior suite layout containing dedicated partition living spaces and executive Club Lounge benefits.',
      price: 220,
      amenities: ['1 King Bed', 'Junior Lounge partition', 'Club Lounge Access', 'Walk-in Shower'],
      gradient: 'from-[#92680a] to-[#121824]',
      bedText: '1 king bed',
      guestsLayout: '3+1',
      category: 'Executive',
      image: '/room_executive_2.png'
    },
    {
      name: 'Deluxe Suite, Club lounge access, 1 Bedroom Larger Suite',
      description: 'Expansive executive luxury featuring separate living room space, walk-in closets, and priority access to our club services.',
      price: 265,
      amenities: ['1 King Bed', 'Expanded Living Room', 'Club Lounge Access', 'Deep Soaking Tub'],
      gradient: 'from-luxury-navy to-[#131926]',
      bedText: '1 king bed',
      guestsLayout: '3+1',
      category: 'Luxury',
      image: '/room_luxury_1.png'
    },
    {
      name: 'Club lounge access, 1 Bedroom Executive Suite, 1 King',
      description: 'The ultimate workspace suite. Features high-speed fiber internet, executive styling parameters, and priority concierge.',
      price: 300,
      amenities: ['1 King Bed', 'Executive Workspace', 'Club Lounge Access', 'Express Butler Sync'],
      gradient: 'from-slate-900 via-luxury-navy to-[#0b0e14]',
      bedText: '1 king bed',
      guestsLayout: '3+1',
      category: 'Executive',
      image: '/room_executive_3.png'
    },
    {
      name: 'TamilNadu Suite, Club lounge access, 1 King, City view',
      description: 'A beautifully decorated cultural heritage suite styled with curated Tamil Nadu art pieces and an expansive city view balcony.',
      price: 380,
      amenities: ['1 King Bed', 'TamilNadu Heritage Decor', 'Club Lounge Access', 'Private Terrace Balcony'],
      gradient: 'from-[#aa7c11] via-[#3b2a0c] to-[#0b0e14]',
      bedText: '1 king bed',
      guestsLayout: '3+1',
      category: 'Executive',
      image: '/room_executive_4.png'
    },
    {
      name: 'Concierge level, 2 Bedroom Presidential Suite, 2 King',
      description: 'The absolute peak of luxury. Two oversized master suites, a rooftop terrace with a private jacuzzi pool, and a butler team.',
      price: 550,
      amenities: ['2 King Beds', 'Full Floor Penthouse', 'Private Roof Jacuzzi', 'Dedicated Butler'],
      gradient: 'from-[#0b0f19] via-[#aa7c11] to-[#0b0f19]',
      bedText: '1 king bed',
      guestsLayout: '3+1',
      category: 'Luxury',
      image: '/room_luxury_2.png'
    }
  ];

  // Testimonials
  const testimonials = [
    {
      quote: "The service at The Grand Royal Resort was absolute perfection. The attention to detail, scenic surroundings, and immediate guest check-in parameters are outstanding.",
      author: "Charlotte H., VIP Guest"
    },
    {
      quote: "Simply the finest stay in Sathy. The suites are exceptionally designed with curated styling, and the poolside services feel incredibly exclusive.",
      author: "Robert T., Business Ambassador"
    }
  ];

  const roomCategories = [
    { id: 'All', name: 'All Options', icon: Compass, desc: 'Browse our complete catalog of luxury rooms and suites.' },
    { id: 'Standard', name: 'Standard Rooms', icon: Bed, desc: 'Cozy and elegant room layouts providing top convenience.' },
    { id: 'Executive', name: 'Executive & Club', icon: ConciergeBell, desc: 'Premium settings with private Club Lounge privileges.' },
    { id: 'Luxury', name: 'Luxury Suites', icon: Star, desc: 'Top penthouses with private jacuzzi pools and butler desk.' }
  ];

  const renderRoomShowcase = (room) => {
    const showcaseImages = [
      { src: room.image || '/luxury_bedroom.png', title: 'Master Bedroom & Sleeping Area', label: 'Primary Area' },
      { src: '/luxury_hall.png', title: 'Gilded Living Hall', label: 'Living Area' },
      { src: '/luxury_kitchen.png', title: 'En-suite Kitchen', label: 'Dining Area' },
      { src: '/luxury_washroom.png', title: 'Marble Washroom', label: 'Restroom' }
    ];

    const handlePrevImage = () => {
      setActiveImageIdx((prev) => (prev === 0 ? showcaseImages.length - 1 : prev - 1));
    };

    const handleNextImage = () => {
      setActiveImageIdx((prev) => (prev === showcaseImages.length - 1 ? 0 : prev + 1));
    };

    return (
      <div className="space-y-8 animate-fade-in text-left">
        {/* Main Grid: Carousel Left, Metadata Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch mt-6">
          {/* Left Column (Image & Progress Indicator) */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg h-[360px] sm:h-[400px]">
              <img 
                src={showcaseImages[activeImageIdx].src} 
                alt={showcaseImages[activeImageIdx].title} 
                className="w-full h-full object-cover transition-all duration-500 animate-fade-in"
                key={activeImageIdx}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none"></div>
              
              {/* Category Badge */}
              <div className="absolute top-4 left-4">
                <span className="text-[8px] font-extrabold tracking-widest uppercase bg-luxury-gold text-luxury-navy px-2.5 py-1 rounded-md shadow-md">
                  {room.category} Tier
                </span>
              </div>

              {/* Slide metadata overlays */}
              <div className="absolute bottom-20 left-6 text-white pointer-events-none">
                <span className="text-[9px] font-bold tracking-widest uppercase text-luxury-gold block">
                  {showcaseImages[activeImageIdx].label}
                </span>
                <h4 className="font-serif text-md font-bold mt-0.5">
                  {showcaseImages[activeImageIdx].title}
                </h4>
              </div>

              {/* Navigation arrows (Dribbble styled) */}
              <div className="absolute bottom-0 left-0 flex overflow-hidden rounded-tr-3xl">
                <button 
                  onClick={handlePrevImage} 
                  className="w-14 h-14 bg-white/90 dark:bg-luxury-darkCard/90 hover:bg-white dark:hover:bg-luxury-darkCard flex items-center justify-center cursor-pointer transition-colors border-none text-slate-800 dark:text-white"
                  type="button"
                >
                  <span className="text-lg">←</span>
                </button>
                <button 
                  onClick={handleNextImage} 
                  className="w-14 h-14 bg-[#8f8059] hover:bg-[#7a6e4d] flex items-center justify-center cursor-pointer transition-colors border-none text-white font-bold"
                  type="button"
                >
                  <span className="text-lg">→</span>
                </button>
              </div>
            </div>

            {/* Carousel slider progress tracker centered below image */}
            <div className="flex items-center justify-center space-x-4 text-xs font-mono font-bold tracking-widest text-slate-400 py-1">
              <span>{`0${activeImageIdx + 1}`}</span>
              <div className="relative w-28 h-[2px] bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-[#8f8059] transition-all duration-300"
                  style={{ width: `${((activeImageIdx + 1) / showcaseImages.length) * 100}%` }}
                ></div>
              </div>
              <span>{`0${showcaseImages.length}`}</span>
            </div>
          </div>

          {/* Right Column: Title details and amenities grid */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Back navigation & Nightly price */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    setSelectedRoomShowcase(null);
                    if (selectedCategoryPage) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      setTimeout(() => {
                        const el = document.getElementById('rooms-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 50);
                    }
                  }}
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-450 hover:text-luxury-gold transition-colors flex items-center space-x-1 cursor-pointer bg-transparent border-none focus:outline-none"
                >
                  <span>← Back to accommodations</span>
                </button>
                <div className="text-right bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 px-4 py-1.5 rounded-full shadow-sm">
                  <span className="text-[10px] font-bold text-[#8f8059] tracking-wider uppercase">₹{room.price}/Day</span>
                </div>
              </div>

              {/* Serif Heading with gold divider */}
              <div className="flex items-center space-x-4 pt-2">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-luxury-navy dark:text-white leading-tight">
                  Find your comfort stay with Cozy Corner
                </h3>
                <div className="hidden sm:block h-[2px] w-12 bg-[#8f8059] flex-shrink-0"></div>
              </div>

              {/* Sub-header or Room Name */}
              <div className="flex items-center space-x-2">
                <span className="text-[9px] font-bold tracking-widest uppercase bg-luxury-gold/15 text-[#8f8059] px-2.5 py-0.5 rounded-md">
                  {room.category} Class
                </span>
                <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-400">{room.name}</span>
              </div>

              {/* Dynamic Description Paragraph */}
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-sans max-w-xl">
                {room.description} Extended design specifications feature central climate controls, gold-accent detailing, soundproofing layers, and executive high-speed connection networks. Our predictive room scheduling system ensures your suite is pre-cooled, lit, and fully prepped for your exact arrival window.
              </p>

              {/* Double Column Checklist */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8f8059]/15 text-[#8f8059] text-[10px] font-bold">✓</span>
                  <span>Virtual Office Setup</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8f8059]/15 text-[#8f8059] text-[10px] font-bold">✓</span>
                  <span>Open Workspace</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8f8059]/15 text-[#8f8059] text-[10px] font-bold">✓</span>
                  <span>Space for Event</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8f8059]/15 text-[#8f8059] text-[10px] font-bold">✓</span>
                  <span>Chill Out Zone</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Features Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-slate-200/50 dark:border-slate-800/50 mt-12">
          {/* Column 1: Location */}
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8f8059]/10 border border-[#8f8059]/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-[#8f8059]" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-serif text-sm font-bold text-luxury-navy dark:text-white">Premium Location</h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-450 leading-relaxed font-sans">
                Nestled directly along Erode-Sathy road corridor with custom coordinates mapping Sathy-Erode.
              </p>
            </div>
          </div>

          {/* Column 2: Availability */}
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8f8059]/10 border border-[#8f8059]/20 flex items-center justify-center">
              <Bed className="w-6 h-6 text-[#8f8059]" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-serif text-sm font-bold text-luxury-navy dark:text-white">Pre-Cooled & Sanitized</h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-450 leading-relaxed font-sans">
                Suite elements are automatically pre-cooled, sanitized, and configured for your specific arrival window.
              </p>
            </div>
          </div>

          {/* Column 3: Wifi */}
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8f8059]/10 border border-[#8f8059]/20 flex items-center justify-center">
              <Wifi className="w-6 h-6 text-[#8f8059]" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-serif text-sm font-bold text-luxury-navy dark:text-white">100% Fiber Internet</h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-450 leading-relaxed font-sans">
                Complimentary high-speed fiber internet with dedicated private suite access points.
              </p>
            </div>
          </div>
        </div>

        {/* Booking Footer Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-center sm:text-left">
            <h4 className="font-serif text-md font-bold dark:text-white">Ready to experience this suite?</h4>
            <p className="text-[11px] text-slate-400 mt-1">Select your dates in the next step to confirm your stay details.</p>
          </div>
          <button
            onClick={() => handleOpenBooking(room.name)}
            className="w-full sm:w-auto btn-gold px-8 py-3 text-xs tracking-wider uppercase font-bold flex items-center justify-center space-x-1.5 shadow-md hover:shadow-glow transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <span>Book Suite Now</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const isTop = scrollY < 50;
  const showSticky = viewMode !== 'profile' && !selectedCategoryPage && !selectedRoomShowcase && isTop;
  const showFloating = viewMode !== 'profile' && !selectedCategoryPage && !selectedRoomShowcase && !isTop;

  // Category page renderer
  const renderCategoryPage = (categoryId) => {
    const catMeta = roomCategories.find(c => c.id === categoryId);
    const filteredRooms = rooms.filter(r => r.category === categoryId);
    const CatIcon = catMeta?.icon;
    const gradientMap = {
      Standard: 'from-slate-900 via-slate-800 to-slate-900',
      Executive: 'from-[#0b0e19] via-[#1a1200] to-[#0b0e19]',
      Luxury: 'from-[#0a0c14] via-[#1a1100] to-[#0a0c14]'
    };
    const accentMap = {
      Standard: 'text-blue-300',
      Executive: 'text-luxury-gold',
      Luxury: 'text-amber-300'
    };

    if (selectedRoomShowcase) {
      return (
        <div className="min-h-screen bg-luxury-cream dark:bg-luxury-dark py-12 px-8 sm:px-16 animate-fade-in">
          <div className="max-w-6xl mx-auto">
            {renderRoomShowcase(selectedRoomShowcase)}
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-luxury-cream dark:bg-luxury-dark">
        {/* Hero Banner for this category */}
        <div className={`relative py-28 px-8 sm:px-16 bg-gradient-to-br ${gradientMap[categoryId]} overflow-hidden`}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[80%] rounded-full bg-luxury-gold/5 blur-[100px] pointer-events-none" />
          <div className="relative z-10 max-w-6xl mx-auto text-center space-y-5">
            {/* Back button */}
            <button
              onClick={() => setSelectedCategoryPage(null)}
              className="absolute left-0 top-0 flex items-center space-x-2 text-slate-300 hover:text-luxury-gold transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-transparent border-none group"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform inline-block">←</span>
              <span>Back to All Rooms</span>
            </button>
            {CatIcon && <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-luxury-gold/10 border border-luxury-gold/30 mx-auto"><CatIcon className="h-7 w-7 text-luxury-gold" /></div>}
            <p className={`text-[10px] uppercase tracking-[0.25em] font-bold font-mono ${accentMap[categoryId]}`}>Curated Accommodations</p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">{catMeta?.name}</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">{catMeta?.desc}</p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <span className="h-px w-16 bg-luxury-gold/40" />
              <span className="text-luxury-gold text-xs font-mono font-bold">{filteredRooms.length} {filteredRooms.length === 1 ? 'ROOM' : 'ROOMS'} AVAILABLE</span>
              <span className="h-px w-16 bg-luxury-gold/40" />
            </div>
          </div>
        </div>

        {/* Rooms grid */}
        <div className="max-w-6xl mx-auto px-8 sm:px-16 py-16 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
            {filteredRooms.map((room) => (
              <div
                key={room.name}
                className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-md flex flex-col hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Image */}
                <div className="h-52 bg-slate-900 overflow-hidden relative">
                  <img
                    src={room.image || '/luxury_bedroom.png'}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Price */}
                  <div className="absolute bottom-3 right-3 text-right">
                    <span className="text-xl font-serif font-bold text-luxury-gold">₹{room.price}</span>
                    <span className="text-[9px] text-slate-300 block leading-none mt-0.5">/ DAY</span>
                  </div>
                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[8px] font-extrabold tracking-widest uppercase bg-luxury-gold text-luxury-navy px-2 py-0.5 rounded-md shadow-sm">
                      {room.category}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1 space-y-4">
                  <div className="space-y-2">
                    <h4
                      onClick={() => { setSelectedRoomShowcase(room); }}
                      className="font-serif text-base font-bold text-luxury-navy dark:text-white leading-snug group-hover:text-luxury-gold cursor-pointer transition-colors duration-200"
                    >
                      {room.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{room.description}</p>
                  </div>

                  {/* Amenities chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.map(a => (
                      <span key={a} className="text-[9px] font-semibold bg-luxury-gold/10 text-luxury-goldDark dark:text-luxury-gold border border-luxury-gold/20 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>

                  {/* Bed & Guests */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-1.5"><Bed className="h-3.5 w-3.5 text-luxury-gold/70" /><span>{room.bedText}</span></div>
                    <div className="flex items-center space-x-1.5"><Users className="h-3.5 w-3.5 text-luxury-gold/70" /><span>{room.guestsLayout === '3+1' ? '3 + Roll-away' : 'Up to 3 Guests'}</span></div>
                  </div>

                  {/* CTA row */}
                  <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
                    <button
                      onClick={() => { setSelectedRoomShowcase(room); }}
                      className="text-[10px] font-bold text-slate-450 hover:text-luxury-gold transition-colors cursor-pointer bg-transparent border-none"
                    >
                      View Gallery &amp; Details
                    </button>
                    <button
                      onClick={() => handleOpenBooking(room.name)}
                      className="btn-gold py-1.5 px-4 text-[10px] uppercase tracking-wider font-bold"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Back button bottom */}
          <div className="flex justify-center pt-6">
            <button
              onClick={() => setSelectedCategoryPage(null)}
              className="flex items-center space-x-2 text-slate-500 hover:text-luxury-gold transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-transparent border-none group"
            >
              <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
              <span>Back to All Accommodations</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-luxury-cream dark:bg-luxury-dark text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300 font-sans">
      
      {/* 1. Sticky Header Navigation (Default) */}
      <header className={`fixed top-0 left-0 right-0 h-20 glass-panel border-b border-slate-200/50 dark:border-slate-800/50 z-40 flex items-center justify-between px-8 sm:px-16 transform transition-all duration-300 ease-in-out ${
        showSticky ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
      }`}>
        {/* Brand Logo */}
        <div className="flex items-center space-x-2">
          <Hotel className="h-6 w-6 text-luxury-gold animate-pulse" />
          <div>
            <h1 className="text-lg font-bold tracking-wider font-serif text-luxury-navy dark:text-white leading-none">
              THE GRAND ROYAL
            </h1>
            <span className="text-[9px] uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold">Sathy Resort</span>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="hover:text-luxury-gold transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1px] after:bg-luxury-gold hover:after:w-full after:transition-all"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* User profile & logout */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right">
            <span className="text-xs text-slate-450 block font-medium">Signed in as</span>
            <button
              onClick={() => setViewMode(viewMode === 'profile' ? 'portal' : 'profile')}
              className="text-xs font-bold text-luxury-gold hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none"
            >
              {viewMode === 'profile' ? '← Back to Resort' : `👤 ${user.name}`}
            </button>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-850"></div>
          {viewMode === 'portal' && (
            <button
              onClick={() => setViewMode('profile')}
              className="px-3 py-1.5 rounded-lg bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold hover:bg-luxury-gold/20 text-xs font-bold transition-all cursor-pointer hidden sm:inline-block"
            >
              My Profile
            </button>
          )}
          <button
            onClick={logout}
            className="p-2 rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors flex-shrink-0"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Floating Capsule Navigation (Scrolled) */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 h-16 md:h-18 w-[95%] xl:w-[1200px] max-w-[95%] glass-panel border border-slate-200/50 dark:border-slate-800/80 rounded-full px-6 md:px-8 shadow-2xl z-50 flex items-center justify-between transition-all duration-300 ease-in-out pointer-events-auto ${
        showFloating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-6 scale-95 pointer-events-none'
      }`}>
        {/* Brand Logo - EXACT same layout and elements as sticky header */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Hotel className="h-5 w-5 md:h-6 md:w-6 text-luxury-gold animate-pulse" />
          <div>
            <h1 className="text-sm md:text-lg font-bold tracking-wider font-serif text-luxury-navy dark:text-white leading-none">
              THE GRAND ROYAL
            </h1>
            <span className="text-[8px] md:text-[9px] uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold block">Sathy Resort</span>
          </div>
        </div>

        {/* Middle: Links Navigation (Exact same list of links and uppercase text-xs font style) */}
        <nav className="flex items-center flex-nowrap overflow-x-auto scrollbar-none max-w-full space-x-1 justify-center w-full md:w-auto px-2">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`px-3 md:px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex-shrink-0 ${
                  isActive
                    ? 'bg-slate-800/85 dark:bg-white/10 text-luxury-gold dark:text-white shadow-sm'
                    : 'text-slate-550 dark:text-slate-350 hover:text-luxury-gold dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Right: User profile & logout - EXACT same layout and elements as sticky header */}
        <div className="flex items-center space-x-3 md:space-x-4 flex-shrink-0">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] md:text-xs text-slate-450 block font-medium">Signed in as</span>
            <button
              onClick={() => setViewMode(viewMode === 'profile' ? 'portal' : 'profile')}
              className="text-[10px] md:text-xs font-bold text-luxury-gold hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none"
            >
              {viewMode === 'profile' ? '← Back to Resort' : `👤 ${user.name}`}
            </button>
          </div>
          <div className="h-6 md:h-8 w-[1px] bg-slate-200 dark:bg-slate-850"></div>
          {viewMode === 'portal' && (
            <button
              onClick={() => setViewMode('profile')}
              className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold hover:bg-luxury-gold/20 text-[10px] md:text-xs font-bold transition-all cursor-pointer hidden sm:inline-block"
            >
              My Profile
            </button>
          )}
          <button
            onClick={logout}
            className="p-1.5 md:p-2 rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors flex-shrink-0"
            title="Log Out"
          >
            <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>

      {selectedRoomShowcase && !selectedCategoryPage ? (
        <div className="min-h-screen bg-luxury-cream dark:bg-luxury-dark pt-28 pb-20 px-8 sm:px-16 flex-1 animate-fade-in">
          <div className="max-w-6xl mx-auto">
            {renderRoomShowcase(selectedRoomShowcase)}
          </div>
        </div>
      ) : selectedCategoryPage ? (
        <div className="pt-0 flex-1 animate-fade-in">
          {renderCategoryPage(selectedCategoryPage)}
        </div>
      ) : viewMode === 'profile' ? (
        <div className="pt-28 pb-20 px-6 sm:px-16 flex-1 bg-gradient-to-tr from-[#06080e] via-[#0b0e17] to-[#151c2d] flex items-center justify-center relative overflow-hidden">
          {/* Glowing premium backgrounds */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-luxury-gold/5 blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#3b2a0c]/20 blur-[120px] pointer-events-none"></div>

          <div className="w-full max-w-5xl bg-[#101625]/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl animate-fade-in grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
            {/* Left side card: Profile Avatar & Stats */}
            <div className="md:col-span-4 p-8 bg-gradient-to-b from-[#080b13] via-[#0f1524] to-[#141b2b] border-r border-slate-800/50 flex flex-col justify-between items-center text-center">
              <div className="space-y-6 w-full flex flex-col items-center">
                {/* Gold glowing Avatar */}
                <div className="relative">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt={user.name} 
                      className="w-24 h-24 rounded-full object-cover border-2 border-luxury-gold/40 shadow-glow/30"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-luxury-gold/10 border-2 border-luxury-gold/40 flex items-center justify-center text-luxury-gold font-serif text-3xl font-bold shadow-glow/30 animate-pulse">
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#080b13] rounded-full"></span>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white font-serif tracking-wide">{user.name}</h3>
                  <span className="text-[10px] text-luxury-gold uppercase tracking-widest font-mono font-bold bg-luxury-gold/10 px-2.5 py-0.5 rounded-full border border-luxury-gold/20 inline-block">
                    GOLD MEMBER
                  </span>
                  <p className="text-[10px] text-slate-550 font-mono mt-1">{user.email}</p>
                </div>

                {/* Sub-tabs buttons */}
                <div className="w-full space-y-2 pt-6">
                  <button
                    onClick={() => setActiveProfileTab('personal')}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-left flex items-center space-x-2.5 cursor-pointer ${
                      activeProfileTab === 'personal'
                        ? 'bg-luxury-gold text-luxury-navy shadow-glow'
                        : 'bg-white/[0.02] border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>👤</span>
                    <span>Personal Details</span>
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('preferences')}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-left flex items-center space-x-2.5 cursor-pointer ${
                      activeProfileTab === 'preferences'
                        ? 'bg-luxury-gold text-luxury-navy shadow-glow'
                        : 'bg-white/[0.02] border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>✨</span>
                    <span>Booked Rooms 😁</span>
                  </button>
                  <button
                    onClick={() => setActiveProfileTab('report-staff')}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-left flex items-center space-x-2.5 cursor-pointer ${
                      activeProfileTab === 'report-staff'
                        ? 'bg-luxury-gold text-luxury-navy shadow-glow'
                        : 'bg-white/[0.02] border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>⚠️</span>
                    <span>Report Staff</span>
                  </button>
                </div>
              </div>

              {/* Account details info card */}
              <div className="w-full border-t border-slate-800/80 pt-6 text-left space-y-2.5">
                <div className="flex justify-between text-[10px] text-slate-455">
                  <span>Joined Date:</span>
                  <span className="text-white font-mono">joined </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-455">
                  <span>Loyalty Level:</span>
                  <span className="text-luxury-gold font-bold">user</span>
                </div>
              </div>
            </div>

            {/* Right side form */}
            <div className="md:col-span-8 p-8 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-serif text-white tracking-wide">
                    {activeProfileTab === 'personal' 
                      ? 'Personal Information Profile' 
                      : activeProfileTab === 'preferences' 
                        ? 'Room Preferences' 
                        : 'Report Staff Member'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeProfileTab === 'personal'
                      ? 'Update your contact information. These details will be automatically pre-filled when you log in.'
                      : activeProfileTab === 'preferences'
                        ? 'View your upcoming stays and active bookings at The Grand Royal Resort.'
                        : 'Help us maintain our 5-star service standards. If you experienced any issues with our staff, file a report.'}
                  </p>
                </div>

                {profileSuccessMsg && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs animate-fade-in">
                    {profileSuccessMsg}
                  </div>
                )}

                {profileErrorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs animate-fade-in">
                    {profileErrorMsg}
                  </div>
                )}

                <div className="space-y-4">
                  {activeProfileTab === 'personal' ? (
                    <>
                      {/* Profile Picture Upload Section */}
                      <div className="bg-[#0a0e1a]/40 border border-slate-800 rounded-xl p-4 flex items-center space-x-4 animate-fade-in text-left">
                        <div className="relative">
                          {profilePicture ? (
                            <img
                              src={profilePicture}
                              alt="Profile Preview"
                              className="w-16 h-16 rounded-full object-cover border border-luxury-gold/40"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center text-luxury-gold font-serif text-xl font-bold">
                              {user.name ? user.name.charAt(0) : 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profile Picture</label>
                          {isEditing ? (
                            <>
                              <div className="flex items-center space-x-2">
                                <label className="bg-luxury-gold/10 border border-luxury-gold/25 hover:bg-luxury-gold/20 text-luxury-gold text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                                  Upload Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProfilePictureChange}
                                    className="hidden"
                                  />
                                </label>
                                {profilePicture && (
                                  <button
                                    type="button"
                                    onClick={() => setProfilePicture('')}
                                    className="border border-red-500/35 hover:bg-red-500/10 text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <span className="text-[8px] text-slate-500 block">Maximum size 200KB. PNG, JPG or GIF formats.</span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 block font-medium">Click "Edit Profile" below to change profile picture.</span>
                          )}
                        </div>
                      </div>

                      {/* Name & Email input */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                          <input
                            type="text"
                            value={user.name}
                            disabled
                            className="w-full bg-[#0a0e1a]/40 border border-slate-800 text-slate-505 rounded-lg px-3.5 py-2.5 text-xs cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                          <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full bg-[#0a0e1a]/40 border border-slate-800 text-slate-505 rounded-lg px-3.5 py-2.5 text-xs cursor-not-allowed font-mono"
                          />
                        </div>
                      </div>

                      {/* Phone, Gender, DOB */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                          <input
                            type="tel"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            placeholder={isEditing ? "+91 96666 66884" : "Not Provided"}
                            disabled={!isEditing}
                            className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all ${
                              isEditing
                                ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                                : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default'
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gender (Optional)</label>
                          <select
                            value={profileGender}
                            onChange={(e) => setProfileGender(e.target.value)}
                            disabled={!isEditing}
                            className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all ${
                              isEditing
                                ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                                : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default appearance-none'
                            }`}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date of Birth (Optional)</label>
                          <input
                            type="date"
                            value={profileDob}
                            onChange={(e) => setProfileDob(e.target.value)}
                            disabled={!isEditing}
                            className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all font-mono ${
                              isEditing
                                ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                                : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Residential Address */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</label>
                        <input
                          type="text"
                          value={profileAddress}
                          onChange={(e) => setProfileAddress(e.target.value)}
                          placeholder={isEditing ? "Street name, door no, apartment etc." : "Not Provided"}
                          disabled={!isEditing}
                          className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all ${
                            isEditing
                              ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                              : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default'
                          }`}
                        />
                      </div>

                      {/* City & State */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">City</label>
                          <input
                            type="text"
                            value={profileCity}
                            onChange={(e) => setProfileCity(e.target.value)}
                            placeholder={isEditing ? "e.g. Sathy" : "Not Provided"}
                            disabled={!isEditing}
                            className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all ${
                              isEditing
                                ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                                : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default'
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">State</label>
                          <input
                            type="text"
                            value={profileState}
                            onChange={(e) => setProfileState(e.target.value)}
                            placeholder={isEditing ? "e.g. Tamil Nadu" : "Not Provided"}
                            disabled={!isEditing}
                            className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all ${
                              isEditing
                                ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                                : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Country & Pincode */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Country</label>
                          <input
                            type="text"
                            value={profileCountry}
                            onChange={(e) => setProfileCountry(e.target.value)}
                            placeholder={isEditing ? "e.g. India" : "Not Provided"}
                            disabled={!isEditing}
                            className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all ${
                              isEditing
                                ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                                : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default'
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pincode / ZIP Code</label>
                          <input
                            type="text"
                            value={profilePincode}
                            onChange={(e) => setProfilePincode(e.target.value)}
                            placeholder={isEditing ? "e.g. 638401" : "Not Provided"}
                            disabled={!isEditing}
                            className={`w-full rounded-lg px-3.5 py-2.5 text-xs transition-all font-mono ${
                              isEditing
                                ? 'bg-[#0a0e1a]/60 border border-slate-800 focus:border-luxury-gold text-white focus:outline-none'
                                : 'bg-[#0a0e1a]/30 border border-slate-900/50 text-slate-300 cursor-default'
                            }`}
                          />
                        </div>
                      </div>
                    </>
                  ) : activeProfileTab === 'preferences' ? (
                    <>
                      {/* Upcoming Stays Section inside Room Preferences */}
                      <div className="space-y-4 text-left">
                        <h4 className="font-serif text-sm font-bold text-white flex items-center space-x-2">
                          <CalendarDays className="h-4 w-4 text-luxury-gold" />
                          <span className="tracking-wide text-white">Your Upcoming Stays</span>
                        </h4>

                        {recentBookings.length > 0 ? (
                          <div className="space-y-3 animate-fade-in">
                            {recentBookings.map((b) => (
                              <div key={b.id || b._id} className="p-4 bg-[#0a0e1a]/60 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold block text-white leading-normal max-w-sm">{b.roomType}</span>
                                  <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                                    {new Date(b.checkIn).toLocaleDateString()}{b.checkInTime ? ` (${b.checkInTime})` : ''} - {new Date(b.checkOut).toLocaleDateString()}{b.checkOutTime ? ` (${b.checkOutTime})` : ''}
                                  </span>
                                </div>
                                <span className="text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full tracking-wider">
                                  BOOKED
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 bg-[#0a0e1a]/30 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500 italic">
                            no suite's were booked till now
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Report Staff Section inside Profile */}
                      <div className="space-y-4 text-left animate-fade-in">
                        {reportSubmitSuccess && (
                          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs text-center mb-4">
                            Report submitted successfully! The quality control team will investigate this incident.
                          </div>
                        )}

                        {reportErrorMsg && (
                          <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs text-center mb-4">
                            {reportErrorMsg}
                          </div>
                        )}

                        <form onSubmit={handleReportSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Guest Name */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Name</label>
                              <input
                                type="text"
                                required
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                className="w-full bg-[#0a0e1a]/60 border border-slate-800 text-white rounded-lg px-3.5 py-2.5 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                              />
                            </div>

                            {/* Room Number */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Number</label>
                              <input
                                type="text"
                                required
                                value={reportRoomNo}
                                onChange={(e) => setReportRoomNo(e.target.value)}
                                placeholder="e.g. 302"
                                className="w-full bg-[#0a0e1a]/60 border border-slate-800 text-white rounded-lg px-3.5 py-2.5 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Staff Member Name */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Member Name</label>
                              <input
                                type="text"
                                required
                                value={reportStaffName}
                                onChange={(e) => setReportStaffName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="w-full bg-[#0a0e1a]/60 border border-slate-800 text-white rounded-lg px-3.5 py-2.5 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                              />
                            </div>

                            {/* Service Department */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Department</label>
                              <input
                                type="text"
                                required
                                value={reportService}
                                onChange={(e) => setReportService(e.target.value)}
                                placeholder="e.g. Housekeeping"
                                className="w-full bg-[#0a0e1a]/60 border border-slate-800 text-white rounded-lg px-3.5 py-2.5 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                              />
                            </div>
                          </div>

                          {/* Submit button inside form for this tab */}
                          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-805/30 mt-4">
                            <button
                              type="button"
                              onClick={handleReportCancel}
                              className="px-5 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 transition-colors cursor-pointer animate-fade-in"
                            >
                              Reset
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
                    </>
                  )}
                </div>
              </div>

              {/* Submit panel */}
              <div className="pt-6 border-t border-slate-800/80 flex justify-between items-center mt-6">
                <button
                  type="button"
                  onClick={() => setViewMode('portal')}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Return to Portal
                </button>
                {activeProfileTab === 'personal' && (
                  <div className="flex items-center">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-5 py-2.5 border border-red-500/35 hover:bg-red-500/10 text-red-400 rounded-lg text-xs font-bold transition-all cursor-pointer mr-3"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={profileUpdateLoading}
                          onClick={async () => {
                            setProfileUpdateLoading(true);
                            setProfileSuccessMsg(null);
                            setProfileErrorMsg(null);
                            try {
                              await updateProfile({
                                phone: profilePhone,
                                address: profileAddress,
                                profilePicture,
                                gender: profileGender,
                                dob: profileDob,
                                city: profileCity,
                                state: profileState,
                                country: profileCountry,
                                pincode: profilePincode
                              });
                              setProfileSuccessMsg('✨ Premium profile settings updated successfully in MySQL!');
                              setIsEditing(false);
                              setTimeout(() => setProfileSuccessMsg(null), 3000);
                            } catch (err) {
                              setProfileErrorMsg(err.message || 'Failed to update profile settings.');
                            } finally {
                              setProfileUpdateLoading(false);
                            }
                          }}
                          className="bg-gradient-to-r from-luxury-gold via-yellow-500 to-luxury-goldDark text-luxury-navy font-bold py-2.5 px-6 rounded-lg text-xs uppercase tracking-wider shadow-glow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                        >
                          {profileUpdateLoading ? 'Saving...' : 'Save Settings'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-luxury-gold via-yellow-500 to-luxury-goldDark text-luxury-navy font-bold py-2.5 px-6 rounded-lg text-xs uppercase tracking-wider shadow-glow hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in flex flex-col">
          {/* 2. Hero Full-Screen Banner */}
          <section id="home" className="relative h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Video backdrop */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scale(1.05)' }}
          >
            <source src="/hotel-bg.mp4" type="video/mp4" />
          </video>
          {/* Darker gradient overlay for excellent text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/80"></div>
        
        </div>
        {/* Abstract Room Design Element */}
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-luxury-gold/5 blur-[120px] pointer-events-none animate-float"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-[#aa7c11]/5 blur-[120px] pointer-events-none animate-float-reverse"></div>
        
        {/* Hero Content Overlay with Drop Shadow for Contrast */}
        <div className="relative z-20 text-center max-w-4xl px-6 space-y-6 mt-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          {/* Rating */}
          <div className="flex items-center justify-center space-x-1 animate-slide-up animation-delay-100">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="h-4 w-4 text-luxury-gold fill-luxury-gold" />
            ))}
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold font-serif text-white leading-tight tracking-wide animate-slide-up animation-delay-200">
            Experience True Luxury
          </h2>
          
          <p className="text-md md:text-lg text-luxury-goldLight font-medium tracking-widest font-mono uppercase animate-slide-up animation-delay-300">
            Your Golden heaven in ERODE
          </p>
          
          <p className="text-sm md:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed font-sans animate-slide-up animation-delay-400">
            Escape to a serene sanctuary of unparalleled comfort in the heart of Tamil Nadu. Curated dining, exclusive wellness spas, and gold-standard personal service await your arrival.
          </p>

          <div className="pt-4 animate-slide-up animation-delay-500">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-slate-400 text-xs tracking-widest uppercase flex flex-col items-center space-y-1 animate-pulse">
          <span className="animate-bounce">↓</span>
          <span>here</span>
        </div>
      </section>

      {/* 3. Availability Quick Search Bar */}
      <section className="relative z-20 max-w-5xl w-full mx-auto px-6 -mt-16 animate-slide-up animation-delay-700">
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
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Erode-Sathy Road, Sathy, Erode, Tamil Nadu</span>
          </div>
          
          <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white leading-tight">
            An Uncompromising Sanctuary of Scenic Comfort
          </h3>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ideally situated along the serene landscapes of Sathyamangalam, The Grand Royal Resort harmonizes structural elegance with premium hospitality parameters. Designed for global travelers, we provide an oasis of absolute calm, privacy, and state-of-the-art conveniences.
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

      {/* 5. Recent Bookings Drawer was moved to My Profile -> Room Preferences */}

      {/* 6. Featured Room Types with booking buttons */}
      <section id="rooms-section" className="py-20 px-8 sm:px-16 max-w-6xl mx-auto space-y-12">
        {selectedRoomShowcase ? (
          renderRoomShowcase(selectedRoomShowcase)
        ) : (
          <>
            <div className="text-center space-y-3">
              <span className="text-xs uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold">Featured Suites</span>
              <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">Curated Accommodations</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">Select your layout suite. All rooms feature elegant aesthetics, high-speed Wi-Fi, and 24/7 personal room service.</p>
            </div>

            {/* Category selection cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {roomCategories.map((cat) => {
                const CatIcon = cat.icon;
                const isActive = activeRoomCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (cat.id === 'All') {
                        setActiveRoomCategory('All');
                      } else {
                        setSelectedCategoryPage(cat.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`p-4 rounded-xl border text-center transition-all duration-300 cursor-pointer flex flex-col justify-center items-center h-28 shadow-sm hover:shadow-glow group ${
                      isActive
                        ? 'bg-luxury-navy border-luxury-gold text-luxury-gold dark:bg-luxury-darkCard dark:border-luxury-gold shadow-glow'
                        : 'bg-white border-slate-200/50 text-slate-500 dark:bg-luxury-darkCard/50 dark:border-slate-800/50 dark:text-slate-400 hover:border-luxury-gold/50'
                    }`}
                  >
                    <CatIcon className="h-5 w-5 mb-2 text-luxury-gold" />
                    <span className="text-[11px] font-bold uppercase tracking-wider block">{cat.name}</span>
                    <span className="text-[8px] text-slate-405 dark:text-slate-500 hidden sm:block mt-1 leading-normal font-sans">{cat.desc}</span>
                    {cat.id !== 'All' && (
                      <span className="text-[8px] text-luxury-gold/70 mt-1 group-hover:text-luxury-gold transition-colors font-mono">View All →</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grid Catalog */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 animate-fade-in">
              {rooms
                .filter((room) => activeRoomCategory === 'All' || room.category === activeRoomCategory)
                .map((room) => (
                  <div 
                    key={room.name} 
                    className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between hover:shadow-glow hover:-translate-y-[2px] active:translate-y-0 transition-all duration-300 group"
                  >
                    {/* Visual Card Header */}
                    <div className="h-44 bg-slate-900 overflow-hidden relative">
                      <img 
                        src={room.image || "/luxury_bedroom.png"} 
                        alt={room.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
                      
                      {/* Price Badge */}
                      <div className="absolute bottom-3 right-3 text-right text-white">
                        <span className="text-lg font-serif font-bold text-luxury-gold">₹{room.price}</span>
                        <span className="text-[9px] text-slate-350 block leading-none mt-0.5">/ DAY</span>
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="text-[8px] font-extrabold tracking-widest uppercase bg-luxury-gold text-luxury-navy px-2 py-0.5 rounded-md shadow-sm">
                          {room.category}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-left">
                      <div className="space-y-2.5">
                        <h4 
                          onClick={() => setSelectedRoomShowcase(room)}
                          className="font-serif text-[15px] font-bold text-luxury-navy dark:text-white leading-snug group-hover:text-luxury-gold cursor-pointer transition-colors duration-200"
                        >
                          {room.name}
                        </h4>
                        
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <Bed className="h-3.5 w-3.5 text-luxury-goldDark dark:text-luxury-gold/60" />
                          <span>{room.bedText}</span>
                        </div>

                        <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-450">
                          <Users className="h-3.5 w-3.5 text-luxury-goldDark dark:text-luxury-gold/60 mr-1.5" />
                          <span>{room.guestsLayout === '3+1' ? '3 Guests + Roll-away Option' : 'Up to 3 Guests'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
                        <button
                          onClick={() => setSelectedRoomShowcase(room)}
                          className="text-[10px] font-bold text-slate-450 hover:text-luxury-gold transition-colors duration-200 cursor-pointer bg-transparent border-none focus:outline-none"
                        >
                          View Gallery & Details
                        </button>
                        <button
                          onClick={() => setSelectedRoomShowcase(room)}
                          className="btn-gold py-1.5 px-4 text-[10px] uppercase tracking-wider font-bold"
                        >
                          Explore Suite
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </section>

      {/* 7. Hotel Facilities Section */}
      <section id="facilities-section" className="py-20 bg-slate-50 dark:bg-luxury-darkCard/20 border-y border-slate-200/50 dark:border-slate-800/50 px-8 sm:px-16">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold font-mono">Resort Experience</span>
            <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">Hotel Facilities</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">Providing gold-standard physical amenities for a restorative getaway experience.</p>
          </div>

          {/* Quick-glance top features */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-xl text-center space-y-2.5 shadow-sm">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Wifi className="h-4.5 w-4.5 text-luxury-gold" />
              </div>
              <h5 className="text-[11px] font-bold dark:text-white uppercase tracking-wider">Free Wi-Fi</h5>
            </div>
            <div className="p-4 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-xl text-center space-y-2.5 shadow-sm">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Utensils className="h-4.5 w-4.5 text-luxury-gold" />
              </div>
              <h5 className="text-[11px] font-bold dark:text-white uppercase tracking-wider">4 Restaurants</h5>
            </div>
            <div className="p-4 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-xl text-center space-y-2.5 shadow-sm">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Waves className="h-4.5 w-4.5 text-luxury-gold" />
              </div>
              <h5 className="text-[11px] font-bold dark:text-white uppercase tracking-wider">Outdoor Pool</h5>
            </div>
            <div className="p-4 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-xl text-center space-y-2.5 shadow-sm">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Car className="h-4.5 w-4.5 text-luxury-gold" />
              </div>
              <h5 className="text-[11px] font-bold dark:text-white uppercase tracking-wider">Free Parking</h5>
            </div>
            <div className="p-4 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-xl text-center space-y-2.5 shadow-sm">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <Dumbbell className="h-4.5 w-4.5 text-luxury-gold" />
              </div>
              <h5 className="text-[11px] font-bold dark:text-white uppercase tracking-wider">Fitness Center</h5>
            </div>
            <div className="p-4 bg-white dark:bg-luxury-darkCard border border-slate-200/40 dark:border-slate-850 rounded-xl text-center space-y-2.5 shadow-sm">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-full inline-flex">
                <ConciergeBell className="h-4.5 w-4.5 text-luxury-gold" />
              </div>
              <h5 className="text-[11px] font-bold dark:text-white uppercase tracking-wider">Room Service</h5>
            </div>
          </div>

          {/* Detailed categorized view */}
          <div className="bg-white dark:bg-luxury-darkCard border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-md">
            {/* Tabs Selector */}
            <div className="flex flex-wrap border-b border-slate-100 dark:border-slate-850 gap-2 pb-4">
              {facilityCategories.map((cat) => {
                const CatIcon = cat.icon;
                const isActive = activeFacilityCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveFacilityCategory(cat.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-luxury-navy dark:bg-luxury-gold text-white dark:text-luxury-navy shadow-sm'
                        : 'text-slate-400 dark:text-slate-500 hover:text-luxury-gold dark:hover:text-luxury-gold'
                    }`}
                  >
                    <CatIcon className="h-4 w-4" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="pt-6">
              {facilityCategories.map((cat) => {
                if (cat.id !== activeFacilityCategory) return null;
                return (
                  <div key={cat.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
                    {cat.items.map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-luxury-dark/40 border border-slate-100 dark:border-slate-850 rounded-xl hover:border-luxury-gold/30 dark:hover:border-luxury-gold/30 transition-colors duration-150"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-luxury-gold flex-shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 border ml-2 ${
                            item.badge === 'Free'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 7.5. House Rules Section */}
      <section id="rules-section" className="py-20 px-8 sm:px-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold font-mono">Resort Policies</span>
          <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">House Rules</h3>
          <p className="text-xs text-slate-450 max-w-md mx-auto">The Grand Royal takes special requests – add them in the next step of your booking!</p>
        </div>

        <div className="bg-white dark:bg-luxury-darkCard border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 md:p-10 shadow-md divide-y divide-slate-100 dark:divide-slate-850 animate-fade-in">
          
          {/* Row 1: Check-in / Check-out */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6 first:pt-0">
            <div className="md:col-span-3 flex items-center space-x-2">
              <Clock className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="text-xs font-bold uppercase tracking-wider dark:text-white">Check-in & Check-out</span>
            </div>
            <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold block dark:text-slate-200">Check-in:  Any Time</span>
                <span className="text-slate-400 mt-1 block leading-relaxed">Guests are required to show a photo identification and credit card upon check-in.</span>
              </div>
              <div>
                <span className="font-semibold block dark:text-slate-200">Check-out: Any Time</span>
                <span className="text-slate-400 mt-1 block leading-relaxed">Smooth checkout. Special requests can be entered during booking.</span>
              </div>
            </div>
          </div>

          {/* Row 2: Cancellation & Prepayment */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6">
            <div className="md:col-span-3 flex items-center space-x-2">
              <Calendar className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="text-xs font-bold uppercase tracking-wider dark:text-white">Cancellation</span>
            </div>
            <div className="md:col-span-9 text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold block dark:text-slate-200">Cancellation & Prepayment Policies</span>
              <p className="mt-1">
                Cancellation and prepayment policies vary according to accommodation type. Enter your stay dates and check the conditions of your selected option.
              </p>
            </div>
          </div>

          {/* Row 3: Children & Extra Beds */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6">
            <div className="md:col-span-3 flex items-center space-x-2">
              <Users className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="text-xs font-bold uppercase tracking-wider dark:text-white">Children & Beds</span>
            </div>
            <div className="md:col-span-9 space-y-4 text-xs">
              <div>
                <span className="font-semibold block dark:text-slate-250 text-luxury-goldDark dark:text-luxury-gold">Child Policies</span>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Children of all ages are welcome. Children 18 and above will be charged as adults at this property.
                  To see correct prices and occupancy info, please add the number and ages of children in your group to your search.
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-luxury-dark/40 border border-slate-100 dark:border-slate-850 p-4 rounded-xl space-y-3">
                <span className="font-semibold block dark:text-slate-200 font-serif">Crib & Extra Bed Policies</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="font-medium text-[9px] uppercase tracking-widest text-slate-400 block font-mono">0 - 2 Years</span>
                    <span className="block dark:text-slate-300">• Extra bed upon request: <strong className="text-luxury-goldDark">₹ 2,160</strong> per child, per night</span>
                    <span className="block dark:text-slate-300">• Crib upon request: <strong className="text-emerald-500 font-bold">Free</strong></span>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium text-[9px] uppercase tracking-widest text-slate-400 block font-mono">3+ Years</span>
                    <span className="block dark:text-slate-300">• Extra bed upon request: <strong className="text-luxury-goldDark">₹ 2,160</strong> per person, per night</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 leading-relaxed">
                  * Prices for cribs and extra beds aren\'t included in the total price. They\'ll have to be paid for separately during your stay. The number of extra beds and cribs allowed depends on the option you choose. Check your selected option for more info. All cribs and extra beds are subject to availability.
                </p>
              </div>
            </div>
          </div>

          {/* Row 4: Age Restriction */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6">
            <div className="md:col-span-3 flex items-center space-x-2">
              <Shield className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="text-xs font-bold uppercase tracking-wider dark:text-white">Age Restrictions</span>
            </div>
            <div className="md:col-span-9 text-xs text-slate-400">
              <span className="font-semibold block dark:text-slate-200">No Age Restriction</span>
              <p className="mt-1">There is no age requirement for check-in.</p>
            </div>
          </div>

          {/* Row 5: Pets */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6">
            <div className="md:col-span-3 flex items-center space-x-2">
              <X className="h-4.5 w-4.5 text-red-500" />
              <span className="text-xs font-bold uppercase tracking-wider dark:text-white">Pets Policy</span>
            </div>
            <div className="md:col-span-9 text-xs text-slate-400">
              <span className="font-semibold text-red-500 block">Pets are not allowed</span>
              <p className="mt-1">Pets are strictly prohibited inside the hotel premises.</p>
            </div>
          </div>

          {/* Row 6: Groups */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6 last:pb-0">
            <div className="md:col-span-3 flex items-center space-x-2">
              <Hotel className="h-4.5 w-4.5 text-luxury-gold" />
              <span className="text-xs font-bold uppercase tracking-wider dark:text-white">Groups Booking</span>
            </div>
            <div className="md:col-span-9 text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold block dark:text-slate-200">Group Reservation Policies</span>
              <p className="mt-1">
                When booking more than 9 rooms, different policies and additional supplements may apply.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 8. Photo Gallery Grid */}
      <section id="gallery-section" className="py-20 px-8 sm:px-16 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-widest text-luxury-goldDark dark:text-luxury-gold font-bold">Visual Splendor</span>
          <h3 className="text-3xl md:text-4xl font-serif font-bold dark:text-white">Resort Photo Gallery</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">Explore snapshots of our luxury Sathy property.</p>
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
            Our luxury property is situated directly on the Erode-Sathy road corridor, offering easy transit routes and premier local access. Let us know if you require personal chauffeur coordination.
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
            <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold block mb-1">Sathy, Erode coordinates</span>
            <span className="text-xs font-bold block dark:text-white">Latitude: 11.5034° N | Longitude: 77.2444° E</span>
          </div>
          {/* Mock vector map visual representation */}
          <div className="border border-dashed border-slate-300 dark:border-slate-850 p-4 rounded-xl flex-1 mt-4 flex items-center justify-center text-[10px] text-slate-450 bg-slate-50/50 dark:bg-luxury-dark/40 font-mono">
            <Compass className="h-6 w-6 text-luxury-gold mr-2 animate-spin-slow" />
            <span>Interactive Map Vector Overlay (Sathy, Erode)</span>
          </div>
        </div>
      </section>

      {/* 10. Guest Feedback Section */}
      <section className="max-w-6xl mx-auto py-12 px-8 sm:px-16 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
        <div className="bg-gradient-to-br from-luxury-navy to-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-luxury-gold/5 blur-[50px] pointer-events-none"></div>
          
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold block mb-1">Your Experience Matters</span>
              <h2 className="text-2xl font-bold font-serif text-white tracking-wide">Share Your Feedback</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                We are committed to providing you with an exceptional experience. Please share your rating and comments about your stay.
              </p>
            </div>

            {feedbackSubmitSuccess && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs text-center mb-6">
                Thank you for your valuable feedback! It has been submitted directly to hotel management.
              </div>
            )}

            {feedbackErrorMsg && (
              <div className="p-4 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs text-center mb-6">
                {feedbackErrorMsg}
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Room Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Number</label>
                  <input
                    type="text"
                    required
                    value={feedbackRoomNo}
                    onChange={(e) => setFeedbackRoomNo(e.target.value)}
                    placeholder="e.g. 302"
                    className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-colors"
                  />
                </div>

                {/* Feedback Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedback Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-colors appearance-none"
                  >
                    <option value="Overall Stay">Overall Stay</option>
                    <option value="Room Service">Room Service</option>
                    <option value="Dining & Food">Dining & Food</option>
                    <option value="Spa & Amenities">Spa & Amenities</option>
                    <option value="Staff Hospitality">Staff Hospitality</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Rating (Stars) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rating</label>
                  <div className="flex items-center space-x-1.5 h-9 bg-luxury-dark border border-slate-800 rounded-lg px-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className="focus:outline-none bg-transparent border-none p-0 cursor-pointer"
                      >
                        <Star
                          className={`h-4.5 w-4.5 ${
                            star <= feedbackRating
                              ? 'text-luxury-gold fill-luxury-gold'
                              : 'text-slate-600'
                          } hover:scale-110 transition-transform`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feedback Comments */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Comments</label>
                <textarea
                  required
                  rows="4"
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Tell us what you liked, or where we can improve..."
                  className="w-full bg-luxury-dark border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:border-luxury-gold focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleFeedbackCancel}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="px-6 py-2 bg-gradient-to-r from-luxury-gold to-luxury-goldDark text-luxury-navy hover:shadow-lg font-bold rounded-lg text-xs transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
      </div>
      )}

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
              <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-luxury-gold"><FaFacebook className="h-4.5 w-4.5" /></a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-luxury-gold"><X className="h-4.5 w-4.5" /></a>
              <a href="https://www.instagram.com/sri0__6/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noopener noreferrer" className="hover:text-luxury-gold"><FaInstagram className="h-4.5 w-4.5" /></a>
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
                  Your stay has been recorded in our ledger. Thank you for choosing " THE GRAND ROYAL RESORT ".
                </p>
              </div>
            ) : bookingStep === 'details' ? (
              <form onSubmit={handleValidateDetails} className="p-6 space-y-4">
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

                    {/* Check In Time */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Check In Time</label>
                      <input
                        type="time"
                        required
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Check Out Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Check Out Date</label>
                      <input
                        type="date"
                        required
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Check Out Time */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Check Out Time</label>
                      <input
                        type="time"
                        required
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
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
                    className="btn-gold text-xs cursor-pointer"
                  >
                    Continue to Payment
                  </button>
                </div>
              </form>
            ) : bookingStep === 'payment' ? (
              <div className="p-6 space-y-6">
                {/* PayPal Styled Header */}
                <div className="bg-[#003087] rounded-xl p-4 text-white flex flex-col items-center shadow-md animate-fade-in">
                  <div className="flex items-center space-x-1">
                    <span className="text-xl font-bold italic text-white font-sans">Pay</span>
                    <span className="text-xl font-bold italic text-[#009cde] font-sans">Pal</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-350 ml-1">Checkout</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-slate-300 mt-1">GUEST RESERVATION PORTAL</span>
                </div>

                {/* Booking Summary */}
                <div className="bg-slate-50 dark:bg-luxury-dark/30 border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-2 text-xs animate-fade-in">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accommodation:</span>
                    <span className="font-bold dark:text-white">{roomType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stay Duration:</span>
                    <span className="font-semibold dark:text-slate-300">
                      {checkIn} ({checkInTime}) to {checkOut} ({checkOutTime})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Price:</span>
                    <span className="font-extrabold text-luxury-gold text-sm">₹ {calculateTotalCost().toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="space-y-3 animate-fade-in">
                  {/* Pay Upon Arrival Option */}
                  <button
                    onClick={() => handleCompleteBooking('arrival')}
                    disabled={loading}
                    className="w-full bg-white hover:bg-slate-50 text-luxury-navy border border-[#003087] font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Hotel className="h-4.5 w-4.5 text-[#003087]" />
                    <span>Pay Upon Arrival</span>
                  </button>

                  {/* Pay with PayPal Option */}
                  <button
                    onClick={() => setBookingStep('card_details')}
                    disabled={loading}
                    className="w-full bg-[#ffc439] hover:bg-[#f2b226] text-luxury-navy font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <span className="italic font-bold text-luxury-navy">PayPal</span>
                    <span className="text-xs font-semibold">Express Checkout</span>
                  </button>

                  {/* Pay with Card Option */}
                  <button
                    onClick={() => setBookingStep('card_details')}
                    disabled={loading}
                    className="w-full bg-[#0079c1] hover:bg-[#0068a6] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold">Pay with Credit/Debit Card</span>
                  </button>
                </div>

                {/* Back button */}
                <button
                  onClick={() => setBookingStep('details')}
                  disabled={loading}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 cursor-pointer font-medium"
                >
                  Back to Stay Details
                </button>
              </div>
            ) : (
              /* bookingStep === 'card_details' */
              <form onSubmit={(e) => handleCompleteBooking('card', e)} className="p-6 space-y-4 animate-fade-in">
                <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-850">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">Secure Payment Gateway</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Total: ₹ {calculateTotalCost().toLocaleString()}</span>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Cardholder Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Card Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Card Number</label>
                    <input
                      type="text"
                      required
                      pattern="[0-9\s]{13,19}"
                      maxLength="19"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="•••• •••• •••• ••••"
                      className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Expiry Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Expiry Date</label>
                      <input
                        type="text"
                        required
                        pattern="(0[1-9]|1[0-2])\/[0-9]{2}"
                        maxLength="5"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* CVV */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CVV</label>
                      <input
                        type="password"
                        required
                        pattern="[0-9]{3,4}"
                        maxLength="4"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-white dark:bg-luxury-dark border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-850 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBookingStep('payment')}
                    disabled={loading}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold text-xs cursor-pointer"
                  >
                    {loading ? 'Processing Payment...' : 'Confirm Stay & Pay'}
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
