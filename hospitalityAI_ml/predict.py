import joblib
import pandas as pd

# Load trained models
regression_model = joblib.load("models/regression_model.pkl")
holt_model = joblib.load("models/holt_model.pkl")

# -------- INPUT --------
holiday = 1
weekend = 1
temperature = 30
bookings = 420
events = 1

# Create DataFrame
input_data = pd.DataFrame([{
    "Holiday": holiday,
    "Weekend": weekend,
    "Temperature": temperature,
    "Bookings": bookings,
    "Events": events
}])

# Multiple Linear Regression Prediction
regression_prediction = regression_model.predict(input_data)[0]

# Holt-Winters Forecast (Next Day)
holt_prediction = holt_model.forecast(1).iloc[0]

# Hybrid Prediction
final_prediction = (0.6 * regression_prediction) + (0.4 * holt_prediction)

print("\n===== Prediction =====")
print(f"Regression Prediction : {regression_prediction:.2f}%")
print(f"Holt-Winters Forecast : {holt_prediction:.2f}%")
print(f"Final Prediction      : {final_prediction:.2f}%")