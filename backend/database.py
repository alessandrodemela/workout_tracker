import os
import gspread
import pandas as pd
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

load_dotenv()

SPREADSHEET_URL = os.getenv("SPREADSHEET_URL", "")
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "../gym-performance-tracker-489013-6dc15c8cd668.json")

def get_gspread_client():
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    if not os.path.exists(CREDENTIALS_FILE):
        raise Exception(f"Credentials file not found: {CREDENTIALS_FILE}")
    credentials = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scopes)
    gc = gspread.authorize(credentials)
    return gc

def get_worksheet(sheet_name: str):
    gc = get_gspread_client()
    return gc.open_by_url(SPREADSHEET_URL).worksheet(sheet_name)

def read_sheet_to_df(sheet_name: str) -> pd.DataFrame:
    ws = get_worksheet(sheet_name)
    records = ws.get_all_records()
    return pd.DataFrame(records)

def append_to_sheet_via_df(sheet_name: str, new_df: pd.DataFrame):
    # Mimics the streamlit behavior of reading, appending, and updating.
    # While append_rows is simpler, this ensures columns match and handles ID generation.
    ws = get_worksheet(sheet_name)
    records = ws.get_all_records()
    existing_df = pd.DataFrame(records)
    
    if sheet_name == "fact_functional_logs" or sheet_name == "dim_exercises":
        # Calculate ID
        id_col = "ID" if sheet_name == "fact_functional_logs" else "ID_Exercise"
        
        if not existing_df.empty and id_col in existing_df.columns:
            last_id = pd.to_numeric(existing_df[id_col], errors='coerce').max()
            next_id = 1 if pd.isna(last_id) else int(last_id) + 1
        else:
            next_id = 1
        
        # If new_df wants us to calculate ID...
        if id_col not in new_df.columns or new_df[id_col].isnull().all():
            new_df.insert(0, id_col, range(next_id, next_id + len(new_df)))

    # Concatenate
    updated_df = pd.concat([existing_df, new_df], ignore_index=True)
    
    # Update spreadsheet
    # We replace everything with the new DF
    ws.clear()
    ws.update([updated_df.columns.values.tolist()] + updated_df.fillna('').values.tolist())
