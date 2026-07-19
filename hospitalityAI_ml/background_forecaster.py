import os
import time
import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from statsmodels.tsa.holtwinters import ExponentialSmoothing

import sys

# Configure output buffering
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Load environment variables from the backend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(current_dir, "..", "backend", ".env")
load_dotenv(dotenv_path=dotenv_path)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/hospitalityAI")

HOLIDAYS_EVENTS = {
    '01-01': { 'name': "New Year's Day", 'impact': 20 },
    '02-14': { 'name': "Valentine's Day", 'impact': 15 },
    '07-04': { 'name': "Independence Day", 'impact': 25 },
    '10-31': { 'name': "Halloween", 'impact': 10 },
    '11-25': { 'name': "Thanksgiving Peak", 'impact': 20 },
    '12-24': { 'name': "Christmas Eve", 'impact': 30 },
    '12-25': { 'name': "Christmas Day", 'impact': 25 },
    '12-31': { 'name': "New Year's Eve", 'impact': 35 },
    '05-15': { 'name': "Spring Food & Wine Festival", 'impact': 15 },
    '05-16': { 'name': "Spring Food & Wine Festival", 'impact': 15 },
    '08-10': { 'name': "Summer Music Fest", 'impact': 30 },
    '08-11': { 'name': "Summer Music Fest", 'impact': 30 },
    '08-12': { 'name': "Summer Music Fest", 'impact': 25 }
}

def parse_js_date(date_str):
    if isinstance(date_str, (datetime.datetime, datetime.date)):
        return datetime.datetime(date_str.year, date_str.month, date_str.day)
    try:
        parts = str(date_str).split('T')[0].split('-')
        year = int(parts[0])
        month = int(parts[1])
        day = int(parts[2])
        return datetime.datetime(year, month, day)
    except Exception:
        return datetime.datetime.now()

def to_date_str(val):
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.strftime("%Y-%m-%d")
    if not val:
        return ""
    return str(val).split('T')[0]

def extract_mlr_features(date_str, index, total_count):
    dt = parse_js_date(date_str)
    day = dt.weekday() + 1  # Monday=1, ..., Sunday=7 in python weekday, but let's match JS getDay(): Sunday=0, Monday=1, ..., Saturday=6
    js_day = dt.isoweekday() % 7  # Sunday=0, Monday=1, ..., Saturday=6
    month = dt.month - 1  # 0 to 11
    
    # 1. Intercept term
    features = [1.0]
    
    # 2. Normalized Trend
    features.append(index / max(1, total_count))
    
    # 3. Day of week dummy variables (1 to 6; Sunday=0 is reference)
    for d in range(1, 7):
        features.append(1.0 if js_day == d else 0.0)
        
    # 4. Month of year dummy variables (0 to 10; December=11 is reference)
    for m in range(0, 11):
        features.append(1.0 if month == m else 0.0)
        
    return features

def calculate_staff_for_occupancy(occupancy_percent, guest_count):
    base_front_desk = 1 if occupancy_percent < 30 else 2 if occupancy_percent < 60 else 3 if occupancy_percent < 85 else 4
    base_housekeeping = 2 if occupancy_percent < 30 else 5 if occupancy_percent < 60 else 9 if occupancy_percent < 85 else 14
    base_restaurant = 2 if occupancy_percent < 30 else 4 if occupancy_percent < 60 else 8 if occupancy_percent < 85 else 12
    base_security = 2 if occupancy_percent < 60 else 3
    base_maintenance = 1 if occupancy_percent < 50 else 2
    
    front_desk = max(base_front_desk, int(np.ceil(guest_count / 150.0)))
    housekeeping = max(base_housekeeping, int(np.ceil(guest_count / 35.0)))
    restaurant = max(base_restaurant, int(np.ceil(guest_count / 45.0)))
    security = max(base_security, int(np.ceil(guest_count / 200.0)))
    maintenance = max(base_maintenance, int(np.ceil(guest_count / 300.0)))
    
    return {
        'Front Desk': front_desk,
        'Housekeeping': housekeeping,
        'Restaurant Services': restaurant,
        'Security': security,
        'Maintenance': maintenance
    }

def main():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db_name = MONGO_URI.split('/')[-1].split('?')[0] or "hospitalityAI"
    db = client[db_name]
    print(f"Connected to database: {db_name}")
    
    while True:
        try:
            # 1. Fetch History
            history_cursor = db.occupancyHistory.find()
            history = list(history_cursor)
            
            if len(history) < 14:
                print(f"Warning: Insufficient occupancyHistory records ({len(history)}). Waiting for more data...")
                time.sleep(10)
                continue
                
            # Convert to DataFrame
            df = pd.DataFrame(history)
            df['date_parsed'] = df['date'].apply(parse_js_date)
            df = df.sort_values('date_parsed').reset_index(drop=True)
            
            # Format dates back to string
            df['date_str'] = df['date_parsed'].dt.strftime("%Y-%m-%d")
            
            # Deduplicate by date_str to ensure one record per day for time series forecasting
            df = df.drop_duplicates(subset=['date_str'], keep='last').reset_index(drop=True)
            
            N = len(df)
            if N < 14:
                print(f"Warning: Insufficient unique occupancyHistory records ({N}) after deduplication. Waiting for more data...")
                time.sleep(10)
                continue
            
            # 2. Fit Multiple Linear Regression (MLR)
            X = []
            for i in range(N):
                X.append(extract_mlr_features(df.loc[i, 'date_str'], i, N))
            X = np.array(X)
            y = df['occupancyPercentage'].values
            
            # Train Ridge model (alpha = 0.01 lambda regularization)
            mlr_model = Ridge(alpha=0.01)
            mlr_model.fit(X, y)
            
            # 3. Fit Holt-Winters Model
            occupancy_series = df['occupancyPercentage'].values
            holt_model = ExponentialSmoothing(
                occupancy_series,
                trend="add",
                seasonal="add",
                seasonal_periods=7
            )
            holt_fit = holt_model.fit()
            
            # 4. Generate forecasts for the next 14 days
            today = datetime.datetime.now()
            today_str = today.strftime("%Y-%m-%d")
            
            forecasts = []
            total_rooms = 500  # Default total rooms
            
            # Get hotels collection
            hotel = db.hotels.find_one()
            if hotel and 'totalRooms' in hotel:
                total_rooms = hotel['totalRooms']
                
            # Fetch active bookings to calculate how many rooms are pre-booked
            active_bookings = list(db.bookings.find({"status": {"$ne": "cancelled"}}))
            
            last_date_str = df.loc[N-1, 'date_str']
            last_date = datetime.datetime.strptime(last_date_str, "%Y-%m-%d")
            max_diff_days = (today + datetime.timedelta(days=13) - last_date).days
            
            if max_diff_days > 0:
                hw_forecast_series = holt_fit.forecast(max_diff_days)
            else:
                hw_forecast_series = None
            
            for i in range(14):
                target_date = today + datetime.timedelta(days=i)
                target_date_str = target_date.strftime("%Y-%m-%d")
                
                # A. MLR Prediction
                diff_days = (target_date - last_date).days
                target_idx = (N - 1) + diff_days
                
                features = extract_mlr_features(target_date_str, target_idx, N)
                mlr_pred = mlr_model.predict([features])[0]
                
                # B. Holt-Winters Prediction
                if diff_days > 0 and hw_forecast_series is not None:
                    hw_pred = hw_forecast_series[diff_days - 1]
                else:
                    fallback_idx = (N - 1) + diff_days
                    if 0 <= fallback_idx < N:
                        hw_pred = holt_fit.fittedvalues[fallback_idx]
                    else:
                        hw_pred = holt_fit.fittedvalues[-1]
                
                # C. Hybrid Prediction
                predicted_occ = (0.6 * mlr_pred) + (0.4 * hw_pred)
                
                # D. Holiday Surge
                month_day_str = target_date.strftime("%m-%d")
                holiday_name = None
                if month_day_str in HOLIDAYS_EVENTS:
                    predicted_occ += HOLIDAYS_EVENTS[month_day_str]['impact']
                    holiday_name = HOLIDAYS_EVENTS[month_day_str]['name']
                    
                # E. Clamping
                predicted_occ = max(12.0, min(100.0, predicted_occ))
                
                # F. Rooms & Guests
                rooms_occupied = int(round((predicted_occ / 100.0) * total_rooms))
                predicted_guests = int(round(rooms_occupied * 1.7))
                
                # G. Staffing
                recommended_staff = calculate_staff_for_occupancy(predicted_occ, predicted_guests)
                
                # H. Insights
                insights = []
                if holiday_name:
                    insights.append(f"Holiday surge for {holiday_name} (+{HOLIDAYS_EVENTS[month_day_str]['impact']}% demand expected). Ensure all shifts are fully staffed.")
                    
                if predicted_occ >= 85:
                    insights.append("Critically high occupancy (>85%) predicted. Housekeeping requires double allocation. Consider scheduling a backup receptionist.")
                elif predicted_occ >= 60:
                    insights.append("Moderate-to-high occupancy expected. Standard staffing levels recommended across all shifts.")
                elif predicted_occ < 35:
                    insights.append("Low demand window. Staffing counts minimized. Save labor costs by offering voluntary time off or scheduling maintenance work.")
                    
                if target_date.weekday() in [4, 5]:  # Friday & Saturday (Python: Mon=0, Fri=4, Sat=5, Sun=6)
                    insights.append("Weekend peak check-in patterns. Front desk staffing levels increased to prevent bottlenecks.")
                    
                # Count actual rooms booked
                rooms_booked = sum(
                    1 for b in active_bookings 
                    if to_date_str(b.get('checkIn')) <= target_date_str < to_date_str(b.get('checkOut'))
                )
                
                forecast_doc = {
                    "date": target_date_str,
                    "predictedOccupancy": round(predicted_occ, 1),
                    "predictedGuests": predicted_guests,
                    "roomsOccupied": rooms_occupied,
                    "roomsBooked": rooms_booked,
                    "recommendedStaff": recommended_staff,
                    "insights": insights,
                    "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                }
                
                forecasts.append(forecast_doc)
                
            # 5. Write to livePredictions collection
            # Clear old predictions and insert new
            db.livePredictions.delete_many({})
            db.livePredictions.insert_many(forecasts)
            
            print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Python Background Forecaster successfully updated live predictions for the next 14 days.")
            
        except Exception as e:
            print(f"Error in forecasting loop: {e}")
            
        time.sleep(10)

if __name__ == "__main__":
    main()
