import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

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

def extract_mlr_features(date_str, index, total_count):
    dt = parse_js_date(date_str)
    js_day = dt.isoweekday() % 7  # Sunday=0, Monday=1, ..., Saturday=6
    month = dt.month - 1  # 0 to 11
    
    features = [1.0]
    features.append(index / max(1, total_count))
    for d in range(1, 7):
        features.append(1.0 if js_day == d else 0.0)
    for m in range(0, 11):
        features.append(1.0 if month == m else 0.0)
    return features

def main():
    # Load dataset
    df = pd.read_csv("dataset/hotel_data.csv")
    df['date_parsed'] = df['Date'].apply(parse_js_date)
    df = df.sort_values('date_parsed').reset_index(drop=True)
    df['date_str'] = df['date_parsed'].dt.strftime("%Y-%m-%d")

    # Deduplicate
    df = df.drop_duplicates(subset=['date_str'], keep='last').reset_index(drop=True)
    N = len(df)

    # Split into 80% train and 20% test (chronologically)
    split_idx = int(N * 0.8)
    train_df = df.iloc[:split_idx].reset_index(drop=True)
    test_df = df.iloc[split_idx:].reset_index(drop=True)

    N_train = len(train_df)
    N_test = len(test_df)

    # Fit Ridge MLR on train set
    X_train = []
    for i in range(N_train):
        X_train.append(extract_mlr_features(train_df.loc[i, 'date_str'], i, N_train))
    X_train = np.array(X_train)
    y_train = train_df['Occupancy'].values

    mlr_model = Ridge(alpha=0.01)
    mlr_model.fit(X_train, y_train)

    # Fit Holt-Winters on train set
    holt_model = ExponentialSmoothing(
        y_train,
        trend="add",
        seasonal="add",
        seasonal_periods=7
    )
    holt_fit = holt_model.fit()

    # Predict on test set
    mlr_preds = []
    hw_preds = []
    hybrid_preds = []

    # For Holt-Winters forecasting on test set (steps 1 to N_test)
    hw_forecast = holt_fit.forecast(N_test)

    for i in range(N_test):
        target_date_str = test_df.loc[i, 'date_str']
        target_date = test_df.loc[i, 'date_parsed']
        
        # MLR Prediction
        target_idx = (N_train - 1) + (i + 1)
        features = extract_mlr_features(target_date_str, target_idx, N_train)
        mlr_pred = mlr_model.predict([features])[0]
        mlr_preds.append(mlr_pred)
        
        # HW Prediction
        hw_pred = hw_forecast[i]
        hw_preds.append(hw_pred)
        
        # Hybrid Prediction
        pred = (0.6 * mlr_pred) + (0.4 * hw_pred)
        
        # Holiday Surge
        month_day_str = target_date.strftime("%m-%d")
        if month_day_str in HOLIDAYS_EVENTS:
            pred += HOLIDAYS_EVENTS[month_day_str]['impact']
            
        pred = max(12.0, min(100.0, pred))
        hybrid_preds.append(pred)

    y_test = test_df['Occupancy'].values

    def get_metrics(y_true, y_pred):
        r2 = r2_score(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        rmse = mean_squared_error(y_true, y_pred) ** 0.5
        return r2, mae, rmse

    r2_mlr, mae_mlr, rmse_mlr = get_metrics(y_test, mlr_preds)
    r2_hw, mae_hw, rmse_hw = get_metrics(y_test, hw_preds)
    r2_hyb, mae_hyb, rmse_hyb = get_metrics(y_test, hybrid_preds)

    print(f"----- Model Performance on Test Set (last {N_test} days of historical data) -----")
    print(f"Multiple Linear Regression (MLR):")
    print(f"  R2 Score : {r2_mlr:.4f}")
    print(f"  MAE      : {mae_mlr:.2f}%")
    print(f"  RMSE     : {rmse_mlr:.2f}%")
    print(f"\nHolt-Winters (HW):")
    print(f"  R2 Score : {r2_hw:.4f}")
    print(f"  MAE      : {mae_hw:.2f}%")
    print(f"  RMSE     : {rmse_hw:.2f}%")
    print(f"\nHybrid Forecaster (0.6 MLR + 0.4 HW + Holiday Surge):")
    print(f"  R2 Score : {r2_hyb:.4f}")
    print(f"  MAE      : {mae_hyb:.2f}%")
    print(f"  RMSE     : {rmse_hyb:.2f}%")

if __name__ == "__main__":
    main()
