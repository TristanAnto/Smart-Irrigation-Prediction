import streamlit as st
import pandas as pd
import joblib
import os
from datetime import datetime
from io import BytesIO

# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Smart Irrigation AI",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# FILE PATHS
# ============================================================

MODEL_FILE = "irrigation_prediction_model.pkl"
HISTORY_FILE = "prediction_history.csv"


# ============================================================
# LOAD MODEL
# ============================================================

@st.cache_resource
def load_model():
    return joblib.load(MODEL_FILE)


try:
    model = load_model()
except Exception as e:
    st.error("Unable to load the irrigation prediction model.")
    st.code(str(e))
    st.stop()


# ============================================================
# HISTORY FUNCTIONS
# ============================================================

def load_history():

    if os.path.exists(HISTORY_FILE):

        try:
            return pd.read_csv(HISTORY_FILE)

        except Exception:
            return pd.DataFrame()

    return pd.DataFrame()


def save_prediction(
    input_data,
    prediction,
    probability_dict
):

    history_row = input_data.copy()

    history_row["Prediction"] = prediction

    history_row["Confidence"] = (
        max(probability_dict.values()) * 100
    )

    history_row["Date_Time"] = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    if os.path.exists(HISTORY_FILE):

        history = load_history()

        history = pd.concat(
            [
                history,
                history_row
            ],
            ignore_index=True
        )

    else:

        history = history_row

    history.to_csv(
        HISTORY_FILE,
        index=False
    )


# ============================================================
# RECOMMENDATION FUNCTION
# ============================================================

def generate_recommendation(
    prediction,
    soil_moisture,
    temperature,
    rainfall,
    humidity,
    crop_type,
    growth_stage
):

    observations = []

    if soil_moisture < 30:
        observations.append(
            "Soil moisture is relatively low."
        )

    elif soil_moisture > 70:
        observations.append(
            "Soil moisture is relatively high."
        )

    if temperature > 35:
        observations.append(
            "Temperature is relatively high."
        )

    elif temperature < 18:
        observations.append(
            "Temperature is relatively low."
        )

    if rainfall < 200:
        observations.append(
            "Recent rainfall value is relatively low."
        )

    elif rainfall > 1000:
        observations.append(
            "Rainfall value is relatively high."
        )

    if humidity < 40:
        observations.append(
            "Humidity is relatively low."
        )

    elif humidity > 80:
        observations.append(
            "Humidity is relatively high."
        )

    if prediction == "High":

        recommendation = (
            "The model predicts a high irrigation requirement. "
            "Pay particular attention to soil moisture and current "
            "weather conditions before making irrigation decisions."
        )

    elif prediction == "Medium":

        recommendation = (
            "The model predicts a medium irrigation requirement. "
            "Monitor soil moisture and weather conditions regularly "
            "and adjust irrigation according to field conditions."
        )

    else:

        recommendation = (
            "The model predicts a low irrigation requirement. "
            "Current conditions indicate that immediate irrigation "
            "demand may be relatively lower."
        )

    return recommendation, observations


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.title("Smart Irrigation AI")

    st.caption(
        "Machine Learning based irrigation requirement prediction"
    )

    st.divider()

    page = st.radio(
        "Navigation",
        [
            "Prediction",
            "What-If Simulator",
            "Prediction History",
            "Analytics Dashboard",
            "Model Explanation"
        ]
    )

    st.divider()

    st.subheader("Project Information")

    st.write(
        """
        This system uses a Random Forest Machine Learning model
        to classify irrigation requirement into three categories:

        Low
        Medium
        High
        """
    )

    st.divider()

    st.caption("Model: Random Forest Classifier")
    st.caption("Accuracy: 98.56%")


# ============================================================
# COMMON INPUT FUNCTION
# ============================================================

def get_inputs(prefix=""):

    st.subheader("Soil Conditions")

    col1, col2, col3 = st.columns(3)

    with col1:

        soil_type = st.selectbox(
            "Soil Type",
            [
                "Clay",
                "Loamy",
                "Sandy",
                "Silt"
            ],
            key=f"{prefix}soil_type"
        )

    with col2:

        soil_ph = st.number_input(
            "Soil pH",
            min_value=0.0,
            max_value=14.0,
            value=6.5,
            step=0.01,
            key=f"{prefix}soil_ph"
        )

    with col3:

        soil_moisture = st.number_input(
            "Soil Moisture (%)",
            min_value=0.0,
            max_value=100.0,
            value=50.0,
            step=0.01,
            key=f"{prefix}soil_moisture"
        )

    col1, col2 = st.columns(2)

    with col1:

        organic_carbon = st.number_input(
            "Organic Carbon",
            min_value=0.0,
            value=1.0,
            step=0.01,
            key=f"{prefix}organic_carbon"
        )

    with col2:

        electrical_conductivity = st.number_input(
            "Electrical Conductivity",
            min_value=0.0,
            value=1.0,
            step=0.01,
            key=f"{prefix}electrical_conductivity"
        )

    st.divider()

    st.subheader("Weather Conditions")

    col1, col2, col3 = st.columns(3)

    with col1:

        temperature = st.number_input(
            "Temperature (°C)",
            min_value=-20.0,
            max_value=60.0,
            value=25.0,
            step=0.01,
            key=f"{prefix}temperature"
        )

    with col2:

        humidity = st.number_input(
            "Humidity (%)",
            min_value=0.0,
            max_value=100.0,
            value=60.0,
            step=0.01,
            key=f"{prefix}humidity"
        )

    with col3:

        rainfall = st.number_input(
            "Rainfall (mm)",
            min_value=0.0,
            value=500.0,
            step=0.01,
            key=f"{prefix}rainfall"
        )

    col1, col2 = st.columns(2)

    with col1:

        sunlight = st.number_input(
            "Sunlight Hours",
            min_value=0.0,
            max_value=24.0,
            value=7.0,
            step=0.01,
            key=f"{prefix}sunlight"
        )

    with col2:

        wind_speed = st.number_input(
            "Wind Speed (km/h)",
            min_value=0.0,
            value=10.0,
            step=0.01,
            key=f"{prefix}wind_speed"
        )

    st.divider()

    st.subheader("Crop Information")

    col1, col2, col3 = st.columns(3)

    with col1:

        crop_type = st.selectbox(
            "Crop Type",
            [
                "Cotton",
                "Maize",
                "Potato",
                "Rice",
                "Sugarcane",
                "Wheat"
            ],
            key=f"{prefix}crop_type"
        )

    with col2:

        growth_stage = st.selectbox(
            "Crop Growth Stage",
            [
                "Flowering",
                "Harvest",
                "Sowing",
                "Vegetative"
            ],
            key=f"{prefix}growth_stage"
        )

    with col3:

        season = st.selectbox(
            "Season",
            [
                "Kharif",
                "Rabi",
                "Zaid"
            ],
            key=f"{prefix}season"
        )

    st.divider()

    st.subheader("Irrigation and Field Information")

    col1, col2, col3 = st.columns(3)

    with col1:

        irrigation_type = st.selectbox(
            "Irrigation Type",
            [
                "Canal",
                "Drip",
                "Rainfed",
                "Sprinkler"
            ],
            key=f"{prefix}irrigation_type"
        )

    with col2:

        water_source = st.selectbox(
            "Water Source",
            [
                "Groundwater",
                "Rainwater",
                "Reservoir",
                "River"
            ],
            key=f"{prefix}water_source"
        )

    with col3:

        field_area = st.number_input(
            "Field Area (hectare)",
            min_value=0.01,
            value=1.0,
            step=0.01,
            key=f"{prefix}field_area"
        )

    col1, col2 = st.columns(2)

    with col1:

        mulching = st.selectbox(
            "Mulching Used",
            [
                "No",
                "Yes"
            ],
            key=f"{prefix}mulching"
        )

    with col2:

        previous_irrigation = st.number_input(
            "Previous Irrigation (mm)",
            min_value=0.0,
            value=20.0,
            step=0.01,
            key=f"{prefix}previous_irrigation"
        )

    region = st.selectbox(
        "Region",
        [
            "Central",
            "East",
            "North",
            "South",
            "West"
        ],
        key=f"{prefix}region"
    )

    return {
        "Soil_Type": soil_type,
        "Soil_pH": soil_ph,
        "Soil_Moisture": soil_moisture,
        "Organic_Carbon": organic_carbon,
        "Electrical_Conductivity": electrical_conductivity,
        "Temperature_C": temperature,
        "Humidity": humidity,
        "Rainfall_mm": rainfall,
        "Sunlight_Hours": sunlight,
        "Wind_Speed_kmh": wind_speed,
        "Crop_Type": crop_type,
        "Crop_Growth_Stage": growth_stage,
        "Season": season,
        "Irrigation_Type": irrigation_type,
        "Water_Source": water_source,
        "Field_Area_hectare": field_area,
        "Mulching_Used": mulching,
        "Previous_Irrigation_mm": previous_irrigation,
        "Region": region
    }


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def make_prediction(input_dict):

    input_data = pd.DataFrame([input_dict])

    prediction = model.predict(input_data)[0]

    probabilities = model.predict_proba(input_data)[0]

    classes = model.classes_

    probability_dict = dict(
        zip(classes, probabilities)
    )

    return (
        input_data,
        prediction,
        probability_dict
    )


# ============================================================
# PREDICTION PAGE
# ============================================================

if page == "Prediction":

    st.title("Smart Irrigation Intelligence")

    st.caption(
        "Predict irrigation requirement using soil, weather, "
        "crop and field conditions."
    )

    st.divider()

    input_dict = get_inputs("main")

    st.divider()

    if st.button(
        "Predict Irrigation Requirement",
        type="primary",
        use_container_width=True
    ):

        input_data, prediction, probability_dict = make_prediction(
            input_dict
        )

        # ----------------------------------------------------
        # RESULT
        # ----------------------------------------------------

        st.subheader("Prediction Result")

        if prediction == "Low":

            st.success(
                "LOW IRRIGATION REQUIREMENT"
            )

        elif prediction == "Medium":

            st.warning(
                "MEDIUM IRRIGATION REQUIREMENT"
            )

        else:

            st.error(
                "HIGH IRRIGATION REQUIREMENT"
            )

        # ----------------------------------------------------
        # CONFIDENCE
        # ----------------------------------------------------

        st.subheader("Prediction Confidence")

        col1, col2, col3 = st.columns(3)

        with col1:

            value = probability_dict.get("Low", 0)

            st.metric(
                "Low",
                f"{value * 100:.2f}%"
            )

            st.progress(float(value))

        with col2:

            value = probability_dict.get("Medium", 0)

            st.metric(
                "Medium",
                f"{value * 100:.2f}%"
            )

            st.progress(float(value))

        with col3:

            value = probability_dict.get("High", 0)

            st.metric(
                "High",
                f"{value * 100:.2f}%"
            )

            st.progress(float(value))

        # ----------------------------------------------------
        # RECOMMENDATION
        # ----------------------------------------------------

        st.divider()

        st.subheader("Smart Irrigation Recommendation")

        recommendation, observations = generate_recommendation(
            prediction,
            input_dict["Soil_Moisture"],
            input_dict["Temperature_C"],
            input_dict["Rainfall_mm"],
            input_dict["Humidity"],
            input_dict["Crop_Type"],
            input_dict["Crop_Growth_Stage"]
        )

        st.info(recommendation)

        if observations:

            st.write("Observed conditions:")

            for observation in observations:

                st.write(f"• {observation}")

        else:

            st.write(
                "No particularly unusual soil or weather values "
                "were detected from the entered inputs."
            )

        # ----------------------------------------------------
        # SAVE HISTORY
        # ----------------------------------------------------

        save_prediction(
            input_data,
            prediction,
            probability_dict
        )

        st.success(
            "Prediction saved to history."
        )

        # ----------------------------------------------------
        # INPUT DETAILS
        # ----------------------------------------------------

        with st.expander("View Entered Field Information"):

            st.dataframe(
                input_data.T.rename(
                    columns={0: "Value"}
                ),
                use_container_width=True
            )


# ============================================================
# WHAT-IF SIMULATOR
# ============================================================

elif page == "What-If Simulator":

    st.title("What-If Irrigation Simulator")

    st.caption(
        "Change field conditions and observe how the model prediction changes."
    )

    st.info(
        "This simulator demonstrates how different input conditions "
        "can affect the model's irrigation requirement classification."
    )

    st.divider()

    input_dict = get_inputs("simulator")

    st.divider()

    if st.button(
        "Run Simulation",
        type="primary",
        use_container_width=True
    ):

        input_data, prediction, probability_dict = make_prediction(
            input_dict
        )

        st.subheader("Simulation Result")

        if prediction == "Low":

            st.success(
                "LOW IRRIGATION REQUIREMENT"
            )

        elif prediction == "Medium":

            st.warning(
                "MEDIUM IRRIGATION REQUIREMENT"
            )

        else:

            st.error(
                "HIGH IRRIGATION REQUIREMENT"
            )

        st.subheader("Simulation Confidence")

        col1, col2, col3 = st.columns(3)

        with col1:

            value = probability_dict.get("Low", 0)

            st.metric(
                "Low",
                f"{value * 100:.2f}%"
            )

            st.progress(float(value))

        with col2:

            value = probability_dict.get("Medium", 0)

            st.metric(
                "Medium",
                f"{value * 100:.2f}%"
            )

            st.progress(float(value))

        with col3:

            value = probability_dict.get("High", 0)

            st.metric(
                "High",
                f"{value * 100:.2f}%"
            )

            st.progress(float(value))

        recommendation, observations = generate_recommendation(
            prediction,
            input_dict["Soil_Moisture"],
            input_dict["Temperature_C"],
            input_dict["Rainfall_mm"],
            input_dict["Humidity"],
            input_dict["Crop_Type"],
            input_dict["Crop_Growth_Stage"]
        )

        st.divider()

        st.subheader("Simulation Recommendation")

        st.info(recommendation)

        if observations:

            for observation in observations:

                st.write(f"• {observation}")


# ============================================================
# PREDICTION HISTORY
# ============================================================

elif page == "Prediction History":

    st.title("Prediction History")

    st.caption(
        "Previously generated irrigation requirement predictions."
    )

    history = load_history()

    if history.empty:

        st.info(
            "No prediction history is available yet. "
            "Make a prediction first."
        )

    else:

        st.subheader("History Overview")

        total_predictions = len(history)

        low_count = (
            history["Prediction"] == "Low"
        ).sum()

        medium_count = (
            history["Prediction"] == "Medium"
        ).sum()

        high_count = (
            history["Prediction"] == "High"
        ).sum()

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric(
                "Total Predictions",
                total_predictions
            )

        with col2:
            st.metric(
                "Low",
                low_count
            )

        with col3:
            st.metric(
                "Medium",
                medium_count
            )

        with col4:
            st.metric(
                "High",
                high_count
            )

        st.divider()

        display_columns = [
            "Date_Time",
            "Crop_Type",
            "Soil_Moisture",
            "Temperature_C",
            "Rainfall_mm",
            "Prediction",
            "Confidence"
        ]

        available_columns = [
            column
            for column in display_columns
            if column in history.columns
        ]

        display_history = history[
            available_columns
        ].copy()

        if "Confidence" in display_history.columns:

            display_history["Confidence"] = (
                display_history["Confidence"]
                .round(2)
                .astype(str)
                + "%"
            )

        st.dataframe(
            display_history,
            use_container_width=True,
            hide_index=True
        )

        st.divider()

        st.subheader("Export History")

        csv_data = history.to_csv(
            index=False
        ).encode("utf-8")

        st.download_button(
            "Download Prediction History",
            data=csv_data,
            file_name="prediction_history.csv",
            mime="text/csv",
            use_container_width=True
        )


# ============================================================
# ANALYTICS DASHBOARD
# ============================================================

elif page == "Analytics Dashboard":

    st.title("Analytics Dashboard")

    st.caption(
        "Analysis of predictions generated by the application."
    )

    history = load_history()

    if history.empty:

        st.info(
            "Analytics will appear after you generate some predictions."
        )

    else:

        # ----------------------------------------------------
        # SUMMARY
        # ----------------------------------------------------

        total = len(history)

        low_count = (
            history["Prediction"] == "Low"
        ).sum()

        medium_count = (
            history["Prediction"] == "Medium"
        ).sum()

        high_count = (
            history["Prediction"] == "High"
        ).sum()

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric(
                "Total Predictions",
                total
            )

        with col2:
            st.metric(
                "Low",
                low_count
            )

        with col3:
            st.metric(
                "Medium",
                medium_count
            )

        with col4:
            st.metric(
                "High",
                high_count
            )

        st.divider()

        # ----------------------------------------------------
        # PREDICTION DISTRIBUTION
        # ----------------------------------------------------

        st.subheader("Prediction Distribution")

        distribution = pd.DataFrame(
            {
                "Prediction": [
                    "Low",
                    "Medium",
                    "High"
                ],
                "Count": [
                    low_count,
                    medium_count,
                    high_count
                ]
            }
        )

        distribution = distribution.set_index(
            "Prediction"
        )

        st.bar_chart(
            distribution
        )

        # ----------------------------------------------------
        # AVERAGE CONDITIONS
        # ----------------------------------------------------

        st.divider()

        st.subheader("Average Field Conditions")

        col1, col2, col3 = st.columns(3)

        with col1:

            if "Soil_Moisture" in history.columns:

                avg_moisture = history[
                    "Soil_Moisture"
                ].mean()

                st.metric(
                    "Average Soil Moisture",
                    f"{avg_moisture:.2f}%"
                )

        with col2:

            if "Temperature_C" in history.columns:

                avg_temperature = history[
                    "Temperature_C"
                ].mean()

                st.metric(
                    "Average Temperature",
                    f"{avg_temperature:.2f} °C"
                )

        with col3:

            if "Rainfall_mm" in history.columns:

                avg_rainfall = history[
                    "Rainfall_mm"
                ].mean()

                st.metric(
                    "Average Rainfall",
                    f"{avg_rainfall:.2f} mm"
                )

        # ----------------------------------------------------
        # CROP ANALYSIS
        # ----------------------------------------------------

        if "Crop_Type" in history.columns:

            st.divider()

            st.subheader("Crop-wise Predictions")

            crop_analysis = pd.crosstab(
                history["Crop_Type"],
                history["Prediction"]
            )

            st.bar_chart(
                crop_analysis
            )

        # ----------------------------------------------------
        # CONDITION ANALYSIS
        # ----------------------------------------------------

        if (
            "Soil_Moisture" in history.columns
            and "Prediction" in history.columns
        ):

            st.divider()

            st.subheader(
                "Average Soil Moisture by Prediction"
            )

            moisture_analysis = history.groupby(
                "Prediction"
            )["Soil_Moisture"].mean()

            st.bar_chart(
                moisture_analysis
            )


# ============================================================
# MODEL EXPLANATION
# ============================================================

elif page == "Model Explanation":

    st.title("Model Explanation")

    st.caption(
        "Understanding the features used by the Random Forest model."
    )

    st.subheader("Model Information")

    col1, col2, col3 = st.columns(3)

    with col1:

        st.metric(
            "Algorithm",
            "Random Forest"
        )

    with col2:

        st.metric(
            "Number of Trees",
            "100"
        )

    with col3:

        st.metric(
            "Accuracy",
            "98.56%"
        )

    st.divider()

    st.subheader("Features Used by the Model")

    feature_names = [
        "Soil_Type",
        "Soil_pH",
        "Soil_Moisture",
        "Organic_Carbon",
        "Electrical_Conductivity",
        "Temperature_C",
        "Humidity",
        "Rainfall_mm",
        "Sunlight_Hours",
        "Wind_Speed_kmh",
        "Crop_Type",
        "Crop_Growth_Stage",
        "Season",
        "Irrigation_Type",
        "Water_Source",
        "Field_Area_hectare",
        "Mulching_Used",
        "Previous_Irrigation_mm",
        "Region"
    ]

    st.write(
        "The model uses the following 19 input features:"
    )

    feature_table = pd.DataFrame(
        {
            "Feature": feature_names
        }
    )

    st.dataframe(
        feature_table,
        use_container_width=True,
        hide_index=True
    )

    st.divider()

    st.subheader("Random Forest Feature Importance")

    try:

        classifier = model.named_steps[
            "classifier"
        ]

        preprocessor = model.named_steps[
            "preprocessor"
        ]

        encoder = preprocessor.named_transformers_[
            "cat"
        ]

        categorical_features = list(
            encoder.get_feature_names_out(
                [
                    "Soil_Type",
                    "Crop_Type",
                    "Crop_Growth_Stage",
                    "Season",
                    "Irrigation_Type",
                    "Water_Source",
                    "Mulching_Used",
                    "Region"
                ]
            )
        )

        numerical_features = [
            "Soil_pH",
            "Soil_Moisture",
            "Organic_Carbon",
            "Electrical_Conductivity",
            "Temperature_C",
            "Humidity",
            "Rainfall_mm",
            "Sunlight_Hours",
            "Wind_Speed_kmh",
            "Field_Area_hectare",
            "Previous_Irrigation_mm"
        ]

        all_feature_names = (
            numerical_features
            + categorical_features
        )

        importance_values = (
            classifier.feature_importances_
        )

        importance_df = pd.DataFrame(
            {
                "Feature": all_feature_names,
                "Importance": importance_values
            }
        )

        importance_df = importance_df.sort_values(
            "Importance",
            ascending=False
        )

        top_features = importance_df.head(15)

        st.bar_chart(
            top_features.set_index(
                "Feature"
            )["Importance"]
        )

        st.write(
            """
            Feature importance indicates how much each processed
            feature contributes to the decisions made by the
            Random Forest model.

            Higher importance does not necessarily mean that a
            feature directly causes a particular irrigation
            requirement. It indicates its relative contribution
            within this trained model.
            """
        )

    except Exception as e:

        st.warning(
            "Feature importance could not be displayed."
        )

        st.code(str(e))

    st.divider()

    st.subheader("How the Prediction Works")

    st.write(
        """
        Step 1:
        The user enters soil, weather, crop, irrigation and field
        information.

        Step 2:
        The categorical values are converted into numerical
        representations using the preprocessing pipeline.

        Step 3:
        The processed information is passed to the Random Forest
        classifier.

        Step 4:
        The model calculates probabilities for Low, Medium and
        High irrigation requirement.

        Step 5:
        The class with the highest predicted probability is
        displayed as the final prediction.
        """
    )

    st.info(
        "The model predicts an irrigation requirement category. "
        "It does not directly calculate an exact water quantity "
        "in litres."
    )


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "Smart Irrigation AI | Machine Learning Agricultural Decision Support System"
)

st.caption(
    "Python | Streamlit | Pandas | Scikit-learn | Random Forest"
)