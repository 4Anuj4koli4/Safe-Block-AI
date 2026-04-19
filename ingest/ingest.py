import pandas as pd
from sqlalchemy import create_engine
import os
import sys

# Configuration
DB_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:rootpassword@localhost:3306/crime_db")
CSV_PATH = "data/crimes.csv"

# Severity Weights
SEVERITY_MAP = {
    'HOMICIDE': 5,
    'BATTERY': 3,
    'ROBBERY': 3,
    'ASSAULT': 3,
    'CRIMINAL SEXUAL ASSAULT': 4,
    'THEFT': 1,
    'DECEPTIVE PRACTICE': 1,
    'MOTOR VEHICLE THEFT': 2,
    'BURGLARY': 2,
    'NARCOTICS': 2,
    'WEAPONS VIOLATION': 3,
}

def ingest_data(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    print(f"Reading {file_path}...")
    df = pd.read_csv(file_path)

    # Normalize column names (handle both JSON API 'latitude' and CSV 'Latitude')
    column_map = {
        'latitude': 'Latitude',
        'longitude': 'Longitude',
        'primary_type': 'Primary Type',
        'date': 'Date',
        'description': 'Description'
    }
    # Case-insensitive mapping
    current_cols = {c.lower(): c for c in df.columns}
    rename_logic = {}
    for lower_target, official in column_map.items():
        if lower_target in current_cols:
            rename_logic[current_cols[lower_target]] = official
    
    if rename_logic:
        df = df.rename(columns=rename_logic)

    # 1. Clean Data: Drop null coordinates
    df = df.dropna(subset=['Latitude', 'Longitude'])

    # 2. Coordinate Truncation: 3 decimal places (~111m grid)
    df['block_lat'] = df['Latitude'].astype(float).round(3)
    df['block_lon'] = df['Longitude'].astype(float).round(3)

    # 3. Map severity weights (default to 1 if not in map)
    df['crime_type'] = df['Primary Type'].str.upper()
    df['severity_weight'] = df['crime_type'].map(SEVERITY_MAP).fillna(1).astype(int)

    # 4. Night Crime Logic: Check if incident occurred between 8 PM and 6 AM
    # Assuming standard Chicago Date format: 01/01/2021 12:00:00 AM
    df['Date'] = pd.to_datetime(df['Date'])
    df['is_night_crime'] = (df['Date'].dt.hour >= 20) | (df['Date'].dt.hour < 6)

    # 5. Extract additional fields
    df['city'] = 'Chicago' # Defaulting to Chicago as per prompt context
    df['incident_date'] = df['Date']
    df['description'] = df['Description']

    # Final table for DB
    db_df = df[['city', 'block_lat', 'block_lon', 'crime_type', 'severity_weight', 'is_night_crime', 'incident_date', 'description']]

    # 6. Batch Insert into MySQL
    print("Connecting to DB...")
    engine = create_engine(DB_URL)
    
    print(f"Inserting {len(db_df)} records...")
    db_df.to_sql('crimes', con=engine, if_exists='append', index=False, chunksize=1000)
    print("Ingestion Complete!")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else CSV_PATH
    ingest_data(path)
