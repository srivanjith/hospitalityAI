import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

from statsmodels.tsa.holtwinters import ExponentialSmoothing

# -----------------------------------------
# Create models folder
# -----------------------------------------
os.makedirs("models", exist_ok=True)

# -----------------------------------------
# Load Dataset
# -----------------------------------------
df = pd.read_csv("dataset/hotel_data.csv")

print("Dataset Loaded Successfully")
print(df.head())

# -----------------------------------------
# Features and Target
# -----------------------------------------
X = df[["Holiday", "Weekend", "Temperature", "Bookings", "Events"]]
y = df["Occupancy"]

# -----------------------------------------
# Split Dataset
# -----------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# -----------------------------------------
# Multiple Linear Regression
# -----------------------------------------
regression_model = LinearRegression()

regression_model.fit(X_train, y_train)

# -----------------------------------------
# Evaluate Model
# -----------------------------------------
predictions = regression_model.predict(X_test)

print("\n----- Multiple Linear Regression -----")
print("R2 Score :", r2_score(y_test, predictions))
print("MAE      :", mean_absolute_error(y_test, predictions))
print("RMSE     :", mean_squared_error(y_test, predictions) ** 0.5)

# -----------------------------------------
# Save Regression Model
# -----------------------------------------
joblib.dump(regression_model, "models/regression_model.pkl")

print("Regression Model Saved")

# -----------------------------------------
# Holt-Winters Model
# -----------------------------------------

occupancy_series = df["Occupancy"]

holt_model = ExponentialSmoothing(
    occupancy_series,
    trend="add",
    seasonal="add",
    seasonal_periods=7
)

holt_fit = holt_model.fit()

# -----------------------------------------
# Save Holt-Winters Model
# -----------------------------------------
joblib.dump(holt_fit, "models/holt_model.pkl")

print("Holt-Winters Model Saved")

# -----------------------------------------
# Forecast Next 14 Days
# -----------------------------------------
forecast = holt_fit.forecast(14)

print("\nNext 14 Day Forecast")
print(forecast)

print("\nTraining Completed Successfully!")