/**
 * Utility to generate a cryptographically solid or standard random 6-digit OTP code.
 * @returns {string} 6-digit numeric code
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
