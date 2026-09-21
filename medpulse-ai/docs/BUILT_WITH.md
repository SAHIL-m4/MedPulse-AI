# 04 | Built With: Technology Breakdown

Complete list of all technologies, frameworks, libraries, APIs, datasets, and tools used in **MedPulse-AI**:

## 🧠 Machine Learning & Data Science
- **Python 3.9+**: Core language runtime.
- **Scikit-Learn**: `RandomForestClassifier` (Sepsis decompensation risk) & `GradientBoostingRegressor` (ICU length-of-stay & financial cost forecasting).
- **Pandas & NumPy**: Empirical dataset generation, feature engineering, Shock Index calculation, MAP computation, and data wrangling.
- **Joblib**: Model serialization and artifact persistence.

## ⚡ Backend & Infrastructure
- **FastAPI**: Asynchronous high-performance REST API framework.
- **Uvicorn**: ASGI web server implementation.
- **Pydantic**: Telemetry payload schema validation and typing.

## 🎨 Web Frontend & UI Engine
- **HTML5 & Vanilla JavaScript (ES6+)**: Semantic frontend application architecture.
- **CSS3 (Custom Glassmorphic Design System)**: Custom dark theme, backdrop-filters, glowing LED indicators, grid/flex layouts.
- **HTML5 Canvas 2D API**: 60fps continuous Lead II ECG waveform rendering.
- **Chart.js**: Interactive chart visualization for ROC-AUC curves, feature importance bars, cost distribution, and resource tiers.
- **Lucide Icons**: Modern vector icon set.
- **Google Fonts**: `Inter` for content typography, `JetBrains Mono` for empirical data and metrics.

## 📁 Datasets
- **Empirical De-identified ICU Telemetry Corpus**: 2,500 de-identified patient records modeled after MIMIC-III / PhysioNet clinical standards.
