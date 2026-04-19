from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from decimal import Decimal

app = FastAPI(title="Smart Crime-Based Housing API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:rootpassword@db:3306/crime_db")
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/safety-score")
def get_safety_score(lat: float, lon: float, db: SessionLocal = Depends(get_db)):
    """
    Calculates safety score for a specific 111mx111m city block.
    1. Truncate lat/lon to 3 decimal places.
    2. Query DB for crimes in that exact block.
    3. Calculate score: 100 - (sum of severity) - (0.5 * night crime penalty).
    """
    # Coordinate Truncation (3 decimal places = ~111m grid)
    block_lat = round(lat, 3)
    block_lon = round(lon, 3)

    query = text("""
        SELECT crime_type, severity_weight, is_night_crime 
        FROM crimes 
        WHERE block_lat = :lat AND block_lon = :lon
    """)
    
    results = db.execute(query, {"lat": block_lat, "lon": block_lon}).fetchall()
    
    total_crimes = len(results)
    if total_crimes == 0:
        return {
            "score": 100,
            "total_crimes": 0,
            "most_common_crime": "None",
            "night_crime_ratio": 0,
            "lat": block_lat,
            "lon": block_lon,
            "block_id": f"{block_lat}_{block_lon}"
        }

    sum_severity = 0
    night_crimes = 0
    crime_counts = {}

    for row in results:
        sum_severity += row.severity_weight
        if row.is_night_crime:
            night_crimes += 1
        
        crime_counts[row.crime_type] = crime_counts.get(row.crime_type, 0) + 1

    # Safety Score Calculation
    # Starting at 100, subtract weighted severity and additional night penalty
    penalty = sum_severity + (night_crimes * 0.5)
    score = max(0, 100 - penalty)
    
    most_common = max(crime_counts, key=crime_counts.get)
    night_ratio = night_crimes / total_crimes

    return {
        "score": round(score, 2),
        "total_crimes": total_crimes,
        "most_common_crime": most_common,
        "night_crime_ratio": round(night_ratio, 2),
        "lat": block_lat,
        "lon": block_lon,
        "block_id": f"{block_lat}_{block_lon}",
        "message": "Specific area safety report localized to 111m grid cell."
    }

@app.get("/health")
def health_check():
    return {"status": "online"}
