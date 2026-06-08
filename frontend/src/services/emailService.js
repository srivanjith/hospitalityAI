const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_default';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_default';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'public_key_default';

/**
 * Sends a 6-digit OTP code to the recipient's email using EmailJS REST API.
 * Handles sandbox fallback when credentials are at their default values.
 * 
 * @param {string} email - Recipient's email address
 * @param {string} otpCode - Generated 6-digit OTP code
 * @param {string} toName - Recipient's name
 * @returns {Promise<boolean>} True if successful
 */
export const sendOTPEmail = async (email, otpCode, toName = 'Valued Guest') => {
  // Check if credentials are default placeholders
  const isDefault = 
    SERVICE_ID === 'service_default' || 
    TEMPLATE_ID === 'template_default' || 
    PUBLIC_KEY === 'public_key_default';

  if (isDefault) {
    console.warn(
      '⚠️ EmailJS is using default/placeholder credentials. Real email delivery will be skipped.\n' +
      'To enable actual email sending, configure VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in your frontend/.env file.'
    );
    
    // Output OTP clearly in the browser console for developer testing
    console.log(
      `%c🔑 HospitalityAI Sandbox OTP Code: ${otpCode} `,
      'background: #0f172a; color: #d4af37; font-size: 16px; font-weight: bold; padding: 10px; border: 1px solid #d4af37; border-radius: 6px;'
    );
    
    // Simulate a brief network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return true;
  }

  // If credentials are customized, attempt EmailJS API delivery
  const payload = {
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: PUBLIC_KEY,
    template_params: {
      to_email: email,
      email: email,
      user_email: email,
      to_name: toName,
      otp: otpCode,
      otp_code: otpCode,
      app_name: 'HospitalityAI',
      expiry_minutes: '5'
    }
  };

  const response = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS Delivery Failed: ${errorText || response.statusText}`);
  }

  // Also log to console as a backup helper even in production mode
  console.log(`%c🔑 OTP Code sent: ${otpCode}`, 'color: #d4af37; font-weight: bold;');
  return true;
};

const BOOKING_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_BOOKING_TEMPLATE_ID || 'template_booking';

/**
 * Sends a booking confirmation email to the user using EmailJS.
 * 
 * @param {string} email - Recipient's email address
 * @param {object} booking - Booking details (roomType, checkIn, checkOut, guestsCount, revenue)
 * @param {string} toName - Recipient's name
 * @returns {Promise<boolean>} True if successful
 */
export const sendBookingConfirmationEmail = async (email, booking, toName = 'Valued Guest') => {
  const isDefault = 
    SERVICE_ID === 'service_default' || 
    BOOKING_TEMPLATE_ID === 'template_booking' || 
    PUBLIC_KEY === 'public_key_default';

  if (isDefault) {
    console.warn(
      '⚠️ EmailJS Booking template or credentials are using default/placeholder values. Real email delivery will be skipped.\n' +
      'To enable actual email sending, configure VITE_EMAILJS_BOOKING_TEMPLATE_ID in your frontend/.env file.'
    );
    
    // Output booking confirmation details in console
    console.log(
      `%c📅 HospitalityAI Sandbox Booking Confirmation sent to: ${email}\n` +
      `Guest Name: ${toName}\n` +
      `Room Type: ${booking.roomType}\n` +
      `Check-in: ${booking.checkIn}\n` +
      `Check-out: ${booking.checkOut}\n` +
      `Guests: ${booking.guestsCount}\n` +
      `Total Cost: $${booking.revenue}`,
      'background: #0f172a; color: #10b981; font-size: 14px; font-weight: bold; padding: 10px; border: 1px solid #10b981; border-radius: 6px;'
    );
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return true;
  }

  const payload = {
    service_id: SERVICE_ID,
    template_id: BOOKING_TEMPLATE_ID,
    user_id: PUBLIC_KEY,
    template_params: {
      to_email: email,
      email: email,
      user_email: email,
      to_name: toName,
      room_type: booking.roomType,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      guests_count: booking.guestsCount,
      total_price: booking.revenue,
      app_name: 'HospitalityAI'
    }
  };

  const response = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS Booking Delivery Failed: ${errorText || response.statusText}`);
  }

  console.log(`%c📅 Booking confirmation email sent successfully to ${email}`, 'color: #10b981; font-weight: bold;');
  return true;
};

