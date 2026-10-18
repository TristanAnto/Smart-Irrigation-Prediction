from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import os


# --------------------------------------------------
# Load the trained ML model
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, "irrigation_prediction_model.pkl")

model = joblib.load(MODEL_FILE)


# --------------------------------------------------
# Create FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Smart Irrigation AI API",
    description="Machine Learning API for Irrigation Requirement Prediction",
    version="1.0"
)


# --------------------------------------------------
# Allow React frontend to communicate with FastAPI
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Input data structure
# --------------------------------------------------

class IrrigationInput(BaseModel):

    Soil_Type: str
    Soil_pH: float
    Soil_Moisture: float
    Organic_Carbon: float
    Electrical_Conductivity: float
    Temperature_C: float
    Humidity: float
    Rainfall_mm: float
    Sunlight_Hours: float
    Wind_Speed_kmh: float

    Crop_Type: str
    Crop_Growth_Stage: str
    Season: str
    Irrigation_Type: str
    Water_Source: str

    Field_Area_hectare: float
    Mulching_Used: str
    Previous_Irrigation_mm: float
    Region: str


# --------------------------------------------------
# Home / health check
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "message": "Smart Irrigation AI API is running"
    }


# --------------------------------------------------
# Prediction API
# --------------------------------------------------

@app.post("/predict")
def predict(data: IrrigationInput):

    # Convert input into DataFrame
    input_data = pd.DataFrame([data.model_dump()])

    # Make prediction
    prediction = model.predict(input_data)[0]

    # Get probabilities
    probabilities = model.predict_proba(input_data)[0]

    # Get class names
    classes = model.classes_

    probability_dict = {
        str(cls): float(prob)
        for cls, prob in zip(classes, probabilities)
    }

    # Highest probability
    confidence = float(max(probabilities))

    return {
        "prediction": str(prediction),
        "confidence": confidence,
        "probabilities": probability_dict
    }
# --------------------------------------------------
# Feature Importance API
# --------------------------------------------------

@app.get("/feature-importance")
def feature_importance():

    # Get the preprocessing step
    preprocessor = model.named_steps["preprocessor"]

    # Get the Random Forest model
    classifier = next(
    step for step in model.named_steps.values()
    if hasattr(step, "feature_importances_")
)

    # Get transformed feature names
    feature_names = preprocessor.get_feature_names_out()

    # Get importance values
    importances = classifier.feature_importances_

    # Combine feature names and importance
    results = []

    for name, importance in zip(feature_names, importances):

        results.append({
            "feature": name,
            "importance": float(importance)
        })

    # Sort from highest to lowest
    results.sort(
        key=lambda x: x["importance"],
        reverse=True
    )

    return {
        "features": results
    }