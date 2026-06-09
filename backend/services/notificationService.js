const { db } = require('../config/db');

/**
 * Creates a notification and saves it to the database
 */
const createNotification = async (type, title, message, dateStr = null) => {
  try {
    const notification = {
      type, // 'occupancy' | 'staffing' | 'high-demand' | 'system'
      title,
      message,
      date: dateStr || new Date().toISOString().split('T')[0],
      read: false,
      createdAt: new Date().toISOString()
    };
    
    // Add notification to database
    return await db.collection('notifications').create(notification);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

/**
 * Checks forecasted occupancy and scheduled staff levels for a given date.
 * Automatically generates alerts if there are issues.
 */
const checkAndGenerateAlerts = async (forecast) => {
  const { date, predictedOccupancy, recommendedStaff, actualStaffScheduled, insights } = forecast;
  
  // 1. High Demand Occupancy Alert
  if (predictedOccupancy >= 85) {
    const existingAlert = await db.collection('notifications').findOne({
      type: 'high-demand',
      date
    });
    if (!existingAlert) {
      await createNotification(
        'high-demand',
        'High Demand Alert',
        `Occupancy for ${date} is forecasted at ${predictedOccupancy}%. Expecting high guest arrivals.`,
        date
      );
    }
  }

  // 2. Staffing Mismatches (Understaffing / Overstaffing)
  if (recommendedStaff && actualStaffScheduled) {
    const departments = Object.keys(recommendedStaff);
    const existingAlerts = await db.collection('notifications').find({ type: 'staffing', date }) || [];
    
    for (const dept of departments) {
      const rec = recommendedStaff[dept];
      const act = actualStaffScheduled[dept] || 0;
      
      const understaffedAlert = existingAlerts.find(a => a.message && a.message.toLowerCase().includes(`understaffed: ${dept.toLowerCase()}`));
      const overstaffedAlert = existingAlerts.find(a => a.message && a.message.toLowerCase().includes(`overstaffed: ${dept.toLowerCase()}`));
      
      if (act < rec) {
        // Delete overstaffed alert if it exists
        if (overstaffedAlert) {
          await db.collection('notifications').deleteOne({ _id: overstaffedAlert.id || overstaffedAlert._id });
        }
        
        // Create understaffed warning if it does not exist
        if (!understaffedAlert) {
          await createNotification(
            'staffing',
            'Staff Shortage Warning',
            `Understaffed: ${dept} department needs ${rec} staff on ${date}, but only ${act} are scheduled.`,
            date
          );
        }
      } else if (act > rec + 2) {
        // Delete understaffed alert if it exists
        if (understaffedAlert) {
          await db.collection('notifications').deleteOne({ _id: understaffedAlert.id || understaffedAlert._id });
        }
        
        // Create overstaffed warning if it does not exist
        if (!overstaffedAlert) {
          await createNotification(
            'staffing',
            'Overstaffing Cost Warning',
            `Overstaffed: ${dept} department has ${act} scheduled on ${date}, but only ${rec} are recommended.`,
            date
          );
        }
      } else {
        // Balanced: delete both alerts if they exist
        if (understaffedAlert) {
          await db.collection('notifications').deleteOne({ _id: understaffedAlert.id || understaffedAlert._id });
        }
        if (overstaffedAlert) {
          await db.collection('notifications').deleteOne({ _id: overstaffedAlert.id || overstaffedAlert._id });
        }
      }
    }
  }
};

/**
 * Email Simulation Helper
 */
const sendEmailSimulation = async (to, subject, body) => {
  console.log(`[EMAIL SIMULATION] Sending email to: ${to}`);
  console.log(`[EMAIL SIMULATION] Subject: ${subject}`);
  console.log(`[EMAIL SIMULATION] Body: ${body}`);
  return true;
};

module.exports = {
  createNotification,
  checkAndGenerateAlerts,
  sendEmailSimulation
};
