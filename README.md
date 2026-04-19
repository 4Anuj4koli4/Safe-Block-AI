# SafeBlock AI: Smart Crime-Based Housing Recommendation System

SafeBlock AI is a spatial decision-making system designed to help users evaluate the safety of specific city blocks. Unlike traditional heatmaps, it uses a **Coordinate Truncation (111m x 111m Grid)** approach to provide hyper-local, actionable safety scores.

![Smart City Dashboard](https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&q=80&w=1200)

## 🚀 Key Features

- **Hyper-Local Precision**: Rounds Latitude/Longitude to 3 decimal places to cluster data at a standard city block level (~111m).
- **Intelligent Safety Scoring**: Calculates a dynamic score (0-100) based on crime severity weights and time-of-day penalties.
- **Interactive Geospatial UI**: Modern React + Leaflet map interface with glassmorphism aesthetics.
- **Integrated Data Pipeline**: Built-in scripts to fetch real-time data from the Chicago Open Data portal.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Leaflet.js, Lucide Icons, Axios.
- **Backend**: FastAPI (Python), SQLAlchemy, Pandas.
- **Database**: MySQL 8.0 with spatial grid indexing.
- **Infrastructure**: Docker & Docker Compose.

---

## 🚦 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Python 3.9+](https://www.python.org/downloads/) (for data ingestion)

### 1. Launch the Services

From the project root, build and start the containers:

```bash
docker-compose up --build
```

This will start:
- **Database**: `localhost:3306`
- **Backend API**: `localhost:8000`
- **Frontend UI**: `localhost:3000`

### 2. Download Crime Data

Use the provided downloader to fetch a sample or the full dataset from Chicago's Open Data portal:

```bash
# Download 100,000 recent crimes (Recommended for quick setup)
python ingest/download_data.py --mode sample --rows 100000
```

### 3. Ingest Data into MySQL

Once the data is downloaded to `data/chicago_crimes.csv`, run the ingestion pipeline:

```bash
python ingest/ingest.py data/chicago_crimes.csv
```

---

## 🧠 Core Spatial Logic

### Coordinate Truncation
Raw GPS data is often too precise and scattered for analytical grouping. By truncating coordinates to **3 decimal places**, we effectively create a grid across the city where each cell is roughly **111m x 111m**.

| Precision | Grid Size | Goal |
| :--- | :--- | :--- |
| 2 Decimals | ~1.1 km | Neighborhood Analysis |
| **3 Decimals** | **~111 m** | **Block-by-Block Safety** |
| 4 Decimals | ~11 m | Building/Property level |

### Safety Score Formula
A block starts with a balance of **100 points**. Penalties are applied as follows:
- **Severity Weight**: Homicide (-5), Battery (-3), Theft (-1), etc.
- **Night Penalty**: An additional **-0.5** for every crime occurring between 8 PM and 6 AM.
- **Normalization**: All scores are capped at a minimum of 0.

---

## 📁 Project Structure

```text
├── api/                # FastAPI Backend
│   ├── main.py         # Scoring Logic & Endpoints
│   └── Dockerfile
├── web/                # React Frontend
│   ├── src/App.jsx     # Map & UI logic
│   └── Dockerfile
├── db/                 # Database Config
│   └── init.sql        # Schema & Indexes
├── ingest/             # Data Pipeline
│   ├── download_data.py
│   └── ingest.py
└── docker-compose.yml  # Orchestration
```

## 📜 License
Internal Development - Built with 💜 
