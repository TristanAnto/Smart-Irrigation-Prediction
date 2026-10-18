
import { useState } from "react";
import "./App.css";

const initialForm = {
  Soil_Type: "Sandy",
  Soil_pH: 6.5,
  Soil_Moisture: 30,
  Organic_Carbon: 1.0,
  Electrical_Conductivity: 1.0,
  Temperature_C: 30,
  Humidity: 60,
  Rainfall_mm: 500,
  Sunlight_Hours: 8,
  Wind_Speed_kmh: 15,
  Crop_Type: "Maize",
  Crop_Growth_Stage: "Vegetative",
  Season: "Zaid",
  Irrigation_Type: "Drip",
  Water_Source: "Groundwater",
  Field_Area_hectare: 5,
  Mulching_Used: "No",
  Previous_Irrigation_mm: 20,
  Region: "South",
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("smartIrrigationLoggedIn") === "true"
  );
  const [loginAnimating, setLoginAnimating] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [activePage, setActivePage] = useState("Dashboard");

  const [form, setForm] = useState(initialForm);
  const [prediction, setPrediction] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);

  const [featureImportance, setFeatureImportance] = useState([]);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureError, setFeatureError] = useState("");

  const numericFields = [
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
    "Previous_Irrigation_mm",
  ];

  const handleLogin = (event) => {
    event.preventDefault();

    setLoginError("");

    if (!email.trim()) {
      setLoginError("Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      setLoginError("Please enter your password.");
      return;
    }

    setLoginAnimating(true);

    setTimeout(() => {
      localStorage.setItem("smartIrrigationLoggedIn", "true");

      setIsLoggedIn(true);
      setLoginAnimating(false);
      setActivePage("Dashboard");
    }, 700);
  };

  const handleLogout = () => {
    localStorage.removeItem("smartIrrigationLoggedIn");

    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
    setPrediction(null);
    setActivePage("Dashboard");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const preparePredictionData = () => {
    const data = { ...form };

    numericFields.forEach((field) => {
      data[field] = Number(data[field]);
    });

    return data;
  };

  const handlePredict = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setPrediction(null);

    const data = preparePredictionData();

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error("Prediction request failed");
      }

      const result = await response.json();

      setPrediction(result);

      setHistory((previousHistory) => [
        {
          date: new Date().toLocaleString(),
          prediction: result.prediction,
          confidence: result.confidence,
          probabilities: result.probabilities,
          waterPerHectare: getWaterRequirement(result.prediction).litersPerHectare,
          totalWater: getWaterRequirement(result.prediction).totalLiters,
          fieldArea: Number(form.Field_Area_hectare) || 0,
          type: "Prediction",
        },
        ...previousHistory,
      ]);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the prediction server. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const runWhatIfSimulation = async () => {
    setLoading(true);
    setError("");
    setPrediction(null);

    const data = preparePredictionData();

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error("Simulation request failed");
      }

      const result = await response.json();

      setPrediction(result);

      setHistory((previousHistory) => [
        {
          date: new Date().toLocaleString(),
          prediction: result.prediction,
          confidence: result.confidence,
          probabilities: result.probabilities,
          waterPerHectare: getWaterRequirement(result.prediction).litersPerHectare,
          totalWater: getWaterRequirement(result.prediction).totalLiters,
          fieldArea: Number(form.Field_Area_hectare) || 0,
          type: "What-If Simulation",
        },
        ...previousHistory,
      ]);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the prediction server."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureImportance = async () => {
    setFeatureLoading(true);
    setFeatureError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/feature-importance"
      );

      if (!response.ok) {
        throw new Error("Failed to load feature importance");
      }

      const result = await response.json();

      setFeatureImportance(result.features || []);
    } catch (err) {
      console.error(err);

      setFeatureError(
        "Unable to load model explainability data. Make sure FastAPI is running."
      );
    } finally {
      setFeatureLoading(false);
    }
  };

  const navigateTo = (page) => {
    setActivePage(page);
    setPrediction(null);
    setError("");
  };

  const getWaterRequirement = (predictionName) => {
    const waterPerHectare = {
      Low: 20000,
      Medium: 40000,
      High: 60000,
    };

    const litersPerHectare =
      waterPerHectare[predictionName] || 0;

    const fieldArea = Number(form.Field_Area_hectare) || 0;

    return {
      litersPerHectare,
      totalLiters: litersPerHectare * fieldArea,
    };
  };

  const renderPredictionResult = (title) => {
    if (!prediction) {
      return null;
    }

    const waterEstimate = getWaterRequirement(
      prediction.prediction
    );

    return (
      <section className="result animated-result">
        <p className="result-label">{title}</p>

        <h2>Prediction Result</h2>

        <div className="prediction-value">
          {prediction.prediction}
        </div>

        <p className="confidence">
          Model Confidence:{" "}
          {(prediction.confidence * 100).toFixed(2)}%
        </p>

        <div className="water-estimate page-card">
          <p className="result-label">PRELIMINARY WATER ESTIMATE</p>

          <h3>Estimated Water Requirement</h3>

          <div className="water-estimate-grid">
            <div>
              <span>Per Hectare</span>
              <strong>
                {waterEstimate.litersPerHectare.toLocaleString()} L/ha
              </strong>
            </div>

            <div>
              <span>Field Area</span>
              <strong>
                {Number(form.Field_Area_hectare).toLocaleString()} ha
              </strong>
            </div>

            <div>
              <span>Estimated Total</span>
              <strong>
                {waterEstimate.totalLiters.toLocaleString()} L
              </strong>
            </div>
          </div>

          <p className="confidence">
            This is a preliminary estimate based on the predicted irrigation level and field area. It is not a direct output of the trained ML model.
          </p>
        </div>

        <div className="prediction-bars">
          {Object.entries(prediction.probabilities).map(
            ([name, value]) => (
              <div className="probability" key={name}>
                <div className="probability-label">
                  <span>{name}</span>

                  <span>
                    {(value * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="bar">
                  <div
                    className="bar-fill animated-bar"
                    style={{ width: (value * 100) + "%" }}
                  ></div>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    );
  };

  const renderPredictionForm = () => (
    <>
      <section className="intro page-enter">
        <p className="eyebrow">MACHINE LEARNING PREDICTION</p>

        <h2>Irrigation Prediction</h2>

        <p>
          Enter soil, weather, crop and irrigation information
          to predict the irrigation requirement.
        </p>
      </section>

      <form onSubmit={handlePredict}>
        <section className="form-section page-card">
          <h2>Soil Conditions</h2>

          <div className="form-grid">
            <div className="field">
              <label>Soil Type</label>

              <select
                name="Soil_Type"
                value={form.Soil_Type}
                onChange={handleChange}
              >
                <option>Clay</option>
                <option>Loamy</option>
                <option>Sandy</option>
                <option>Silt</option>
              </select>
            </div>

            <div className="field">
              <label>Soil pH</label>

              <input
                type="number"
                step="0.01"
                name="Soil_pH"
                value={form.Soil_pH}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Soil Moisture</label>

              <input
                type="number"
                step="0.01"
                name="Soil_Moisture"
                value={form.Soil_Moisture}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Organic Carbon</label>

              <input
                type="number"
                step="0.01"
                name="Organic_Carbon"
                value={form.Organic_Carbon}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Electrical Conductivity</label>

              <input
                type="number"
                step="0.01"
                name="Electrical_Conductivity"
                value={form.Electrical_Conductivity}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="form-section page-card">
          <h2>Weather Conditions</h2>

          <div className="form-grid">
            <div className="field">
              <label>Temperature (°C)</label>

              <input
                type="number"
                step="0.01"
                name="Temperature_C"
                value={form.Temperature_C}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Humidity (%)</label>

              <input
                type="number"
                step="0.01"
                name="Humidity"
                value={form.Humidity}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Rainfall (mm)</label>

              <input
                type="number"
                step="0.01"
                name="Rainfall_mm"
                value={form.Rainfall_mm}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Sunlight Hours</label>

              <input
                type="number"
                step="0.01"
                name="Sunlight_Hours"
                value={form.Sunlight_Hours}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Wind Speed (km/h)</label>

              <input
                type="number"
                step="0.01"
                name="Wind_Speed_kmh"
                value={form.Wind_Speed_kmh}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="form-section page-card">
          <h2>Crop Information</h2>

          <div className="form-grid">
            <div className="field">
              <label>Crop Type</label>

              <select
                name="Crop_Type"
                value={form.Crop_Type}
                onChange={handleChange}
              >
                <option>Cotton</option>
                <option>Maize</option>
                <option>Potato</option>
                <option>Rice</option>
                <option>Sugarcane</option>
                <option>Wheat</option>
              </select>
            </div>

            <div className="field">
              <label>Crop Growth Stage</label>

              <select
                name="Crop_Growth_Stage"
                value={form.Crop_Growth_Stage}
                onChange={handleChange}
              >
                <option>Flowering</option>
                <option>Harvest</option>
                <option>Sowing</option>
                <option>Vegetative</option>
              </select>
            </div>

            <div className="field">
              <label>Season</label>

              <select
                name="Season"
                value={form.Season}
                onChange={handleChange}
              >
                <option>Kharif</option>
                <option>Rabi</option>
                <option>Zaid</option>
              </select>
            </div>
          </div>
        </section>

        <section className="form-section page-card">
          <h2>Irrigation Information</h2>

          <div className="form-grid">
            <div className="field">
              <label>Irrigation Type</label>

              <select
                name="Irrigation_Type"
                value={form.Irrigation_Type}
                onChange={handleChange}
              >
                <option>Canal</option>
                <option>Drip</option>
                <option>Rainfed</option>
                <option>Sprinkler</option>
              </select>
            </div>

            <div className="field">
              <label>Water Source</label>

              <select
                name="Water_Source"
                value={form.Water_Source}
                onChange={handleChange}
              >
                <option>Groundwater</option>
                <option>Rainwater</option>
                <option>Reservoir</option>
                <option>River</option>
              </select>
            </div>

            <div className="field">
              <label>Field Area (hectare)</label>

              <input
                type="number"
                step="0.01"
                name="Field_Area_hectare"
                value={form.Field_Area_hectare}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Mulching Used</label>

              <select
                name="Mulching_Used"
                value={form.Mulching_Used}
                onChange={handleChange}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="field">
              <label>Previous Irrigation (mm)</label>

              <input
                type="number"
                step="0.01"
                name="Previous_Irrigation_mm"
                value={form.Previous_Irrigation_mm}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Region</label>

              <select
                name="Region"
                value={form.Region}
                onChange={handleChange}
              >
                <option>Central</option>
                <option>East</option>
                <option>North</option>
                <option>South</option>
                <option>West</option>
              </select>
            </div>
          </div>
        </section>

        <button
          className="predict-button animated-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Analyzing..."
            : "Predict Irrigation Requirement"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {renderPredictionResult("AI ANALYSIS")}
    </>
  );

  const renderWhatIfSimulator = () => (
    <>
      <section className="intro page-enter">
        <p className="eyebrow">SCENARIO SIMULATION</p>

        <h2>What-If Simulator</h2>

        <p>
          Change environmental conditions and observe how the
          machine learning prediction changes.
        </p>
      </section>

      <section className="form-section page-card">
        <h2>Simulation Conditions</h2>

        <div className="form-grid">
          <div className="field">
            <label>Soil Moisture</label>

            <input
              type="number"
              step="0.01"
              value={form.Soil_Moisture}
              onChange={(e) =>
                setForm({
                  ...form,
                  Soil_Moisture: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Temperature (°C)</label>

            <input
              type="number"
              step="0.01"
              value={form.Temperature_C}
              onChange={(e) =>
                setForm({
                  ...form,
                  Temperature_C: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Humidity (%)</label>

            <input
              type="number"
              step="0.01"
              value={form.Humidity}
              onChange={(e) =>
                setForm({
                  ...form,
                  Humidity: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Rainfall (mm)</label>

            <input
              type="number"
              step="0.01"
              value={form.Rainfall_mm}
              onChange={(e) =>
                setForm({
                  ...form,
                  Rainfall_mm: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Sunlight Hours</label>

            <input
              type="number"
              step="0.01"
              value={form.Sunlight_Hours}
              onChange={(e) =>
                setForm({
                  ...form,
                  Sunlight_Hours: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Wind Speed (km/h)</label>

            <input
              type="number"
              step="0.01"
              value={form.Wind_Speed_kmh}
              onChange={(e) =>
                setForm({
                  ...form,
                  Wind_Speed_kmh: e.target.value,
                })
              }
            />
          </div>
        </div>

        <button
          className="predict-button animated-button"
          type="button"
          onClick={runWhatIfSimulation}
          disabled={loading}
        >
          {loading ? "Simulating..." : "Run Simulation"}
        </button>
      </section>

      {error && <div className="error">{error}</div>}

      {renderPredictionResult("WHAT-IF ANALYSIS")}
    </>
  );

  const renderPredictionHistory = () => (
    <>
      <section className="intro page-enter">
        <p className="eyebrow">SESSION RECORDS</p>

        <h2>Prediction History</h2>

        <p>
          Review predictions and What-If simulations made during
          this session.
        </p>
      </section>

      <section className="history-section">
        {history.length === 0 ? (
          <div className="history-empty">
            <h3>No predictions yet</h3>

            <p>
              Run a prediction or What-If simulation to see the
              results here.
            </p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item, index) => (
              <div
                className="history-card page-card"
                key={index}
              >
                <div className="history-top">
                  <div>
                    <span className="history-type">
                      {item.type || "Prediction"}
                    </span>

                    <p className="history-date">
                      {item.date}
                    </p>
                  </div>

                  <div className="history-result">
                    {item.prediction}
                  </div>
                </div>

                <div className="history-confidence">
                  Confidence:{" "}
                  {(item.confidence * 100).toFixed(2)}%
                </div>

                {item.waterPerHectare && (
                  <div className="history-confidence">
                    Estimated Water: {item.waterPerHectare.toLocaleString()} L/ha |
                    Total: {item.totalWater.toLocaleString()} L for {item.fieldArea} ha
                  </div>
                )}

                <div className="history-probabilities">
                  {Object.entries(item.probabilities).map(
                    ([name, value]) => (
                      <div
                        className="history-probability"
                        key={name}
                      >
                        <span>{name}</span>

                        <span>
                          {(value * 100).toFixed(2)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderAnalytics = () => {
    const totalPredictions = history.length;

    const highCount = history.filter(
      (item) => item.prediction === "High"
    ).length;

    const mediumCount = history.filter(
      (item) => item.prediction === "Medium"
    ).length;

    const lowCount = history.filter(
      (item) => item.prediction === "Low"
    ).length;

    const averageConfidence =
      totalPredictions > 0
        ? history.reduce(
            (sum, item) => sum + item.confidence,
            0
          ) / totalPredictions
        : 0;

    return (
      <>
        <section className="intro page-enter">
          <p className="eyebrow">MODEL STATISTICS</p>

          <h2>Analytics Dashboard</h2>

          <p>
            Overview of prediction results generated during the
            current session.
          </p>
        </section>

        <section className="analytics-cards">
          <div className="analytics-card animated-card">
            <p>Total Predictions</p>
            <h3>{totalPredictions}</h3>
          </div>

          <div className="analytics-card animated-card">
            <p>High Predictions</p>
            <h3>{highCount}</h3>
          </div>

          <div className="analytics-card animated-card">
            <p>Medium Predictions</p>
            <h3>{mediumCount}</h3>
          </div>

          <div className="analytics-card animated-card">
            <p>Low Predictions</p>
            <h3>{lowCount}</h3>
          </div>

          <div className="analytics-card animated-card">
            <p>Average Confidence</p>

            <h3>
              {(averageConfidence * 100).toFixed(2)}%
            </h3>
          </div>
        </section>

        <section className="analytics-section page-card">
          <h2>Prediction Distribution</h2>

          <div className="distribution">
            <div className="distribution-row">
              <span>High</span>

              <div className="distribution-bar">
                <div
                  className="distribution-fill"
                  style={{
                    width:
                      totalPredictions > 0
                      ? (highCount / totalPredictions) * 100 + "%"
                      : "0%",
                  }}
                ></div>
              </div>

              <strong>{highCount}</strong>
            </div>

            <div className="distribution-row">
              <span>Medium</span>

              <div className="distribution-bar">
                <div
                  className="distribution-fill"
                  style={{
                    width:
                      totalPredictions > 0
                      ? (mediumCount / totalPredictions) * 100 + "%"
                      : "0%",
                  }}
                ></div>
              </div>

              <strong>{mediumCount}</strong>
            </div>

            <div className="distribution-row">
              <span>Low</span>

              <div className="distribution-bar">
                <div
                  className="distribution-fill"
                  style={{
                    width:
                      totalPredictions > 0
                      ? (lowCount / totalPredictions) * 100 + "%"
                      : "0%",
                  }}
                ></div>
              </div>

              <strong>{lowCount}</strong>
            </div>
          </div>
        </section>
      </>
    );
  };

  const renderExplainability = () => {
    const maxImportance =
      featureImportance.length > 0
        ? featureImportance[0].importance
        : 1;

    const formatFeatureName = (name) => {
      return name
        .replace("remainder__", "")
        .replace("categorical__", "")
        .replaceAll("_", " ");
    };

    return (
      <>
        <section className="intro page-enter">
          <p className="eyebrow">AI TRANSPARENCY</p>

          <h2>Model Explainability</h2>

          <p>
            Understand which input features contribute most to
            the Random Forest irrigation prediction model.
          </p>
        </section>

        <section className="analytics-section page-card">
          <div
            className="explainability-header"
          >
            <div>
              <h2>Feature Importance</h2>

              <p>
                Higher values indicate greater contribution to
                the model's predictions.
              </p>
            </div>

            <button
              className="predict-button"
              type="button"
              onClick={loadFeatureImportance}
              disabled={featureLoading}
            >
              {featureLoading
                ? "Loading..."
                : "Load Feature Importance"}
            </button>
          </div>

          {featureError && (
            <div className="error">
              {featureError}
            </div>
          )}

          {featureImportance.length === 0 &&
            !featureLoading &&
            !featureError && (
              <div className="history-empty">
                <h3>
                  Feature importance not loaded
                </h3>

                <p>
                  Click "Load Feature Importance" to retrieve
                  the feature importance values.
                </p>
              </div>
            )}

          {featureLoading && (
            <div className="history-empty">
              <h3>Loading model information</h3>

              <p>
                Retrieving feature importance from the
                machine learning model.
              </p>
            </div>
          )}

          {featureImportance.length > 0 && (
            <div className="feature-importance-list">
              {featureImportance.map(
                (item, index) => {
                  const percentage =
                    item.importance * 100;

                  const barWidth =
                    maxImportance > 0
                      ? (item.importance /
                          maxImportance) *
                        100
                      : 0;

                  return (
                    <div
                      className="feature-importance-item"
                      key={item.feature + "-" + index}
                    >
                      <div className="feature-importance-header">
                        <span>
                          {formatFeatureName(
                            item.feature
                          )}
                        </span>

                        <strong>
                          {percentage.toFixed(2)}%
                        </strong>
                      </div>

                      <div className="feature-importance-bar">
                        <div
                          className="feature-importance-fill animated-bar"
                          style={{ width: barWidth + "%" }}
                        ></div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </>
    );
  };

  const renderDashboard = () => (
    <>
      <section className="dashboard-hero page-enter">
        <div>
          <p className="eyebrow">
            MACHINE LEARNING SYSTEM
          </p>

          <h2>
            Smart Irrigation
            <br />
            Requirement Prediction
          </h2>

          <p>
            Analyze soil, weather, crop and irrigation
            conditions using your trained machine learning
            model.
          </p>

          <button
            className="dashboard-button animated-button"
            onClick={() =>
              navigateTo("Prediction")
            }
          >
            Start Prediction
          </button>
        </div>

        <div className="hero-orbit">
          <div className="hero-circle">
            AI
          </div>
        </div>
      </section>

      <section className="dashboard-stats">
        <div className="stat-card animated-card">
          <span>MODEL ACCURACY</span>
          <strong>98.56%</strong>
        </div>

        <div className="stat-card animated-card">
          <span>ALGORITHM</span>
          <strong>Random Forest</strong>
        </div>

        <div className="stat-card animated-card">
          <span>INPUT FEATURES</span>
          <strong>19</strong>
        </div>

        <div className="stat-card animated-card">
          <span>OUTPUT CLASSES</span>
          <strong>3</strong>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card animated-card">
          <h3>Prediction</h3>

          <p>
            Predict whether the irrigation requirement is
            Low, Medium or High and view a preliminary water
            requirement estimate for the field.
          </p>

          <button
            onClick={() =>
              navigateTo("Prediction")
            }
          >
            Open Prediction
          </button>
        </div>

        <div className="dashboard-card animated-card">
          <h3>What-If Simulator</h3>

          <p>
            Change input conditions and compare prediction
            outcomes.
          </p>

          <button
            onClick={() =>
              navigateTo("What-If Simulator")
            }
          >
            Open Simulator
          </button>
        </div>

        <div className="dashboard-card animated-card">
          <h3>Prediction History</h3>

          <p>
            Review previous irrigation prediction results.
          </p>

          <button
            onClick={() =>
              navigateTo("Prediction History")
            }
          >
            View History
          </button>
        </div>

        <div className="dashboard-card animated-card">
          <h3>Analytics</h3>

          <p>
            Explore prediction statistics and model results.
          </p>

          <button
            onClick={() =>
              navigateTo("Analytics")
            }
          >
            View Analytics
          </button>
        </div>

        <div className="dashboard-card animated-card">
          <h3>Model Explainability</h3>

          <p>
            Understand which features influence the model.
          </p>

          <button
            onClick={() =>
              navigateTo("Model Explainability")
            }
          >
            Explain Model
          </button>
        </div>
      </section>
    </>
  );

  if (!isLoggedIn) {
    return (
      <>
        <style>{`
          @keyframes loginBackground {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.08);
            }
            100% {
              transform: scale(1);
            }
          }

          @keyframes loginCard {
            from {
              opacity: 0;
              transform: translateY(35px) scale(0.97);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes floating {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-14px);
            }
          }

          @keyframes loginExit {
            from {
              opacity: 1;
              transform: scale(1);
            }
            to {
              opacity: 0;
              transform: scale(1.05);
            }
          }

          .login-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            background:
              radial-gradient(
                circle at 20% 20%,
                rgba(70, 130, 180, 0.22),
                transparent 35%
              ),
              radial-gradient(
                circle at 80% 80%,
                rgba(46, 125, 50, 0.18),
                transparent 35%
              ),
              #07111f;
            padding: 30px;
          }

          .login-screen::before {
            content: "";
            position: absolute;
            width: 700px;
            height: 700px;
            border-radius: 50%;
            background: rgba(46, 125, 50, 0.08);
            animation: loginBackground 8s ease-in-out infinite;
          }

          .login-decoration {
            position: absolute;
            width: 220px;
            height: 220px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 50%;
            animation: floating 6s ease-in-out infinite;
          }

          .login-decoration.one {
            top: 10%;
            left: 8%;
          }

          .login-decoration.two {
            bottom: 8%;
            right: 8%;
            width: 160px;
            height: 160px;
            animation-delay: 1.5s;
          }

          .login-card {
            width: min(430px, 100%);
            position: relative;
            z-index: 2;
            padding: 42px;
            border-radius: 24px;
            background: rgba(12, 25, 42, 0.88);
            border: 1px solid rgba(255,255,255,0.10);
            box-shadow:
              0 30px 80px rgba(0,0,0,0.45),
              inset 0 1px 0 rgba(255,255,255,0.06);
            backdrop-filter: blur(18px);
            animation: loginCard 0.8s ease-out;
          }

          .login-exit {
            animation: loginExit 0.7s ease-in forwards;
          }

          .login-brand {
            text-align: center;
            margin-bottom: 32px;
          }

          .login-logo {
            width: 74px;
            height: 74px;
            margin: 0 auto 20px;
            border-radius: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 25px;
            font-weight: 800;
            letter-spacing: 1px;
            color: white;
            background: linear-gradient(
              135deg,
              #2e7d32,
              #1976d2
            );
            box-shadow:
              0 12px 35px rgba(25,118,210,0.30);
            animation: floating 4s ease-in-out infinite;
          }

          .login-brand h1 {
            margin: 0;
            font-size: 30px;
            color: white;
            letter-spacing: -0.5px;
          }

          .login-brand p {
            margin: 9px 0 0;
            color: rgba(255,255,255,0.62);
            font-size: 14px;
          }

          .login-form {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .login-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .login-field label {
            color: rgba(255,255,255,0.82);
            font-size: 13px;
            font-weight: 600;
          }

          .login-input-wrapper {
            position: relative;
          }

          .login-input {
            width: 100%;
            box-sizing: border-box;
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: white;
            outline: none;
            font-size: 14px;
            transition: all 0.25s ease;
          }

          .login-input:focus {
            border-color: rgba(76,175,80,0.75);
            background: rgba(255,255,255,0.09);
            box-shadow: 0 0 0 4px rgba(76,175,80,0.10);
          }

          .password-input {
            padding-right: 75px;
          }

          .show-password {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.62);
            cursor: pointer;
            font-size: 12px;
          }

          .show-password:hover {
            color: white;
          }

          .login-error {
            padding: 11px 13px;
            border-radius: 10px;
            background: rgba(198,40,40,0.12);
            border: 1px solid rgba(239,83,80,0.25);
            color: #ffb4b4;
            font-size: 13px;
          }

          .login-button {
            margin-top: 6px;
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(
              135deg,
              #2e7d32,
              #1976d2
            );
            color: white;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition:
              transform 0.25s ease,
              box-shadow 0.25s ease;
          }

          .login-button:hover {
            transform: translateY(-2px);
            box-shadow:
              0 12px 30px rgba(25,118,210,0.25);
          }

          .login-footer {
            margin-top: 25px;
            text-align: center;
            color: rgba(255,255,255,0.42);
            font-size: 12px;
          }

          .login-footer strong {
            color: rgba(255,255,255,0.72);
          }

          .login-demo {
            margin-top: 16px;
            padding: 11px;
            border-radius: 10px;
            background: rgba(255,255,255,0.04);
            text-align: center;
            color: rgba(255,255,255,0.48);
            font-size: 11px;
          }

          .page-enter {
            animation: pageEnter 0.5s ease-out;
          }

          @keyframes pageEnter {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .page-card {
            animation: pageEnter 0.55s ease-out;
          }

          .animated-card {
            transition:
              transform 0.3s ease,
              box-shadow 0.3s ease;
          }

          .animated-card:hover {
            transform: translateY(-5px);
          }

          .animated-button {
            transition:
              transform 0.25s ease,
              box-shadow 0.25s ease;
          }

          .animated-button:hover:not(:disabled) {
            transform: translateY(-2px);
          }

          .animated-button:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }

          .animated-result {
            animation: resultAppear 0.55s ease-out;
          }

          @keyframes resultAppear {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .animated-bar {
            animation: barGrow 0.9s ease-out;
            transform-origin: left;
          }

          @keyframes barGrow {
            from {
              width: 0 !important;
            }
          }

          .dashboard-stats {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 18px;
            margin: 28px 0;
          }

          .stat-card {
            padding: 22px;
            border-radius: 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
          }

          .stat-card span {
            display: block;
            font-size: 11px;
            letter-spacing: 1px;
            opacity: 0.55;
            margin-bottom: 8px;
          }

          .stat-card strong {
            font-size: 21px;
          }

          .hero-orbit {
            width: 190px;
            height: 190px;
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: floating 5s ease-in-out infinite;
          }

          .hero-circle {
            width: 105px;
            height: 105px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(
              135deg,
              #2e7d32,
              #1976d2
            );
            color: white;
            box-shadow:
              0 15px 45px rgba(25,118,210,0.25);
          }

          .explainability-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }

          @media (max-width: 800px) {
            .dashboard-stats {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .hero-orbit {
              display: none;
            }
          }

          @media (max-width: 520px) {
            .login-card {
              padding: 28px 22px;
            }

            .dashboard-stats {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div
          className={`login-screen ${
            loginAnimating ? "login-exit" : ""
          }`}
        >
          <div className="login-decoration one"></div>
          <div className="login-decoration two"></div>

          <div className="login-card">
            <div className="login-brand">
              <div className="login-logo">
                AI
              </div>

              <h1>Smart Irrigation AI</h1>

              <p>
                Intelligent Irrigation Requirement Prediction
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={handleLogin}
            >
              <div className="login-field">
                <label>Email Address</label>

                <input
                  className="login-input"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              <div className="login-field">
                <label>Password</label>

                <div className="login-input-wrapper">
                  <input
                    className="login-input password-input"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                  />

                  <button
                    className="show-password"
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="login-error">
                  {loginError}
                </div>
              )}

              <button
                className="login-button"
                type="submit"
              >
                {loginAnimating
                  ? "Signing In..."
                  : "Sign In"}
              </button>
            </form>

            <div className="login-demo">
              Demo authentication — enter any valid
              email and password.
            </div>

            <div className="login-footer">
              Powered by{" "}
              <strong>Random Forest Machine Learning</strong>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>Smart Irrigation AI</h1>

          <p>
            Intelligent Irrigation Requirement Prediction
          </p>
        </div>

        <div className="header-actions">
          <div className="status">
            <span></span>
            API Connected
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="navbar">
        {[
          "Dashboard",
          "Prediction",
          "What-If Simulator",
          "Prediction History",
          "Analytics",
          "Model Explainability",
        ].map((page) => (
          <button
            key={page}
            className={
              activePage === page
                ? "nav-active"
                : ""
            }
            onClick={() =>
              navigateTo(page)
            }
          >
            {page}
          </button>
        ))}
      </nav>

      <main className="container">
        {activePage === "Dashboard" &&
          renderDashboard()}

        {activePage === "Prediction" &&
          renderPredictionForm()}

        {activePage === "What-If Simulator" &&
          renderWhatIfSimulator()}

        {activePage === "Prediction History" &&
          renderPredictionHistory()}

        {activePage === "Analytics" &&
          renderAnalytics()}

        {activePage === "Model Explainability" &&
          renderExplainability()}
      </main>
    </div>
  );
}

export default App;