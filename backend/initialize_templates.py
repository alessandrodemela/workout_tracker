import os
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import json

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

SPREADSHEET_URL = os.getenv("SPREADSHEET_URL", "")
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "gym-performance-tracker-489013-6dc15c8cd668.json")
CREDENTIALS_JSON = os.getenv("GOOGLE_CREDENTIALS_JSON")

def get_gspread_client():
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    
    if CREDENTIALS_JSON:
        creds_dict = json.loads(CREDENTIALS_JSON)
        credentials = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    else:
        # Get absolute path to the project root
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(backend_dir)
        
        # Possible locations for credentials
        possible_paths = [
            os.path.join(project_root, CREDENTIALS_FILE),
            os.path.join(backend_dir, CREDENTIALS_FILE),
            os.path.abspath(CREDENTIALS_FILE)
        ]
        
        creds_path = None
        for p in possible_paths:
            if os.path.exists(p):
                creds_path = p
                break
        
        if not creds_path:
            raise Exception(f"Credentials file not found. Tried: {possible_paths}")
        
        credentials = Credentials.from_service_account_file(creds_path, scopes=scopes)
        
    gc = gspread.authorize(credentials)
    return gc

def initialize_templates_sheet():
    gc = get_gspread_client()
    sh = gc.open_by_url(SPREADSHEET_URL)
    
    sheet_name = "dim_workout_templates"
    
    try:
        sh.worksheet(sheet_name)
        print(f"Sheet '{sheet_name}' already exists.")
    except gspread.exceptions.WorksheetNotFound:
        # Create sheet
        sh.add_worksheet(title=sheet_name, rows="100", cols="10")
        ws = sh.worksheet(sheet_name)
        
        # Add headers
        headers = [
            "ID", 
            "Week_Number", 
            "Mesocycle", 
            "Split", 
            "Exercise_Number", 
            "Exercise_Name", 
            "Sets", 
            "Reps", 
            "RPE", 
            "Notes"
        ]
        ws.update([headers])
        print(f"Sheet '{sheet_name}' created successfully with headers.")

if __name__ == "__main__":
    if not SPREADSHEET_URL:
        print("Error: SPREADSHEET_URL not found in .env")
    else:
        initialize_templates_sheet()
