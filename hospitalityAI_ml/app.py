from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

app = FastAPI(title="HospitalityAI ML API")

# Load trained models
regression_model = joblib.load("models/regression_model.pkl")
holt_model = joblib.load("models/holt_model.pkl")


class PredictionInput(BaseModel):
    holiday: int
    weekend: int
    temperature: float
    bookings: int
    events: int


@app.get("/")
def home():
    return {"message": "HospitalityAI ML API is running"}


@app.post("/predict")
def predict(data: PredictionInput):

    input_data = pd.DataFrame([{
        "Holiday": data.holiday,
        "Weekend": data.weekend,
        "Temperature": data.temperature,
        "Bookings": data.bookings,
        "Events": data.events
    }])

    regression_prediction = regression_model.predict(input_data)[0]
    holt_prediction = holt_model.forecast(1).iloc[0]

    final_prediction = (
        0.6 * regression_prediction +
        0.4 * holt_prediction
    )

    return {
        "regression_prediction": round(float(regression_prediction), 2),
        "holt_prediction": round(float(holt_prediction), 2),
        "final_prediction": round(float(final_prediction), 2)
    }