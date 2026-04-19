"""
Download Chicago Crime Dataset
Supports: full CSV download or small sample for local dev/testing
"""

import argparse
import sys
from pathlib import Path

import requests
from tqdm import tqdm


SOCRATA_API = "https://data.cityofchicago.org/resource/ijzp-q8t2.json"
FULL_CSV_URL = (
    "https://data.cityofchicago.org/api/views/ijzp-q8t2/rows.csv?accessType=DOWNLOAD"
)

def download_sample(out_path: Path, limit: int = 100_000):
    """Download N rows via JSON API → save as CSV."""
    print(f"[DOWNLOAD] Fetching {limit:,} rows via Socrata API…")
    rows = []
    offset = 0
    batch = 50_000
    while offset < limit:
        fetch = min(batch, limit - offset)
        url = f"{SOCRATA_API}?$limit={fetch}&$offset={offset}&$order=date DESC"
        resp = requests.get(url, timeout=120)
        resp.raise_for_status()
        chunk = resp.json()
        if not chunk:
            break
        rows.extend(chunk)
        offset += len(chunk)
        print(f"  …fetched {offset:,} / {limit:,}")

    import pandas as pd
    df = pd.DataFrame(rows)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"[DOWNLOAD] Saved {len(df):,} rows → {out_path}")


def download_full(out_path: Path):
    """Stream the full CSV (≈1.8 GB) with a progress bar."""
    print("[DOWNLOAD] Starting full CSV download (may take several minutes)…")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with requests.get(FULL_CSV_URL, stream=True, timeout=300) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        with open(out_path, "wb") as f, tqdm(
            total=total, unit="iB", unit_scale=True, desc="chicago_crimes.csv"
        ) as bar:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                bar.update(len(chunk))

    print(f"[DOWNLOAD] Saved → {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download Chicago Crime Data")
    parser.add_argument("--mode",  choices=["sample", "full"], default="sample")
    parser.add_argument("--rows",  type=int, default=100_000, help="Rows for sample mode")
    parser.add_argument("--out",   default="data/chicago_crimes.csv")
    args = parser.parse_args()

    out = Path(args.out)
    if args.mode == "sample":
        download_sample(out, limit=args.rows)
    else:
        download_full(out)
