import gspread
from google.oauth2.service_account import Credentials
import logging
# ──────────────────────────────────────────────
# 1. Credentials & Connection
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# ──────────────────────────────────────────────
SCOPE = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

CREDENTIALS_FILE = "gym-performance-tracker-489013-6dc15c8cd668.json"
DATABASE_NAME = "Workout_Database"

creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPE)
client = gspread.authorize(creds)

logging.info(f"Connected as: {creds.service_account_email}")

# ──────────────────────────────────────────────
# 2. Open or Create the Google Spreadsheet
# ──────────────────────────────────────────────
try:
    sh = client.open(DATABASE_NAME)
    logging.info(f"Spreadsheet '{DATABASE_NAME}' opened successfully.")
except gspread.exceptions.SpreadsheetNotFound:
    logging.error(f"Spreadsheet '{DATABASE_NAME}' not found.")
    logging.error("Service accounts cannot create Google Sheets files directly (no Drive storage quota).")
    logging.error("Please follow these steps:")
    logging.error("  1. Go to https://sheets.google.com and create a new spreadsheet.")
    logging.error(f"  2. Name it exactly: {DATABASE_NAME}")
    logging.error(f"  3. Click 'Share' and add '{creds.service_account_email}' with 'Editor' role.")
    logging.error("  4. Re-run this script.")
    exit(1)

# ──────────────────────────────────────────────
# 3. Definizione dello schema del database
# ──────────────────────────────────────────────
TABLES = {
    "fact_workout_logs": {
        "headers": [
            "Exercise",       # Nome esercizio (FK → dim_exercises.Exercise_Name)
            "Kg",             # Carico utilizzato
            "Sets",           # Numero di serie
            "Reps",           # Numero di ripetizioni
            "RPE",            # Rating of Perceived Exertion (1-10)
            "Date",           # Data della sessione (YYYY-MM-DD)
            "Mesocycle",      # Numero del mesociclo
            "Session_Type",   # Tipologia sessione
            "Notes",          # Note libere
            "upload_processed_at", # Data di upload
        ],
        "rows": 5000,
    },
    "dim_exercises": {
        "headers": [
            "ID_Exercise",      # Identificatore univoco dell'esercizio
            "Exercise_Name",    # Nome dell'esercizio
            "Target_Muscle",    # Muscolo primario coinvolto
            "Target_Area",      # Area coinvolta
            "Equipment",        # Strumento utilizzato
            "Bio_Notes",        # Note biomeccaniche / esecuzione
        ],
        "rows": 500,
    },
}

# ──────────────────────────────────────────────
# 4. Funzione di creazione / aggiornamento foglio
# ──────────────────────────────────────────────
def setup_worksheet(spreadsheet, title, headers, rows=1000):
    """
    Crea il foglio se non esiste, oppure recupera quello esistente.
    In entrambi i casi imposta (o sovrascrive) le intestazioni nella riga 1.
    """
    existing_titles = [ws.title for ws in spreadsheet.worksheets()]

    if title not in existing_titles:
        ws = spreadsheet.add_worksheet(title=title, rows=str(rows), cols=str(len(headers)))
        logging.info(f"Sheet '{title}' created.")
    else:
        ws = spreadsheet.worksheet(title)
        logging.info(f"Sheet '{title}' already exists — updating headers.")

    # Scrivi le intestazioni nella prima riga
    ws.update("A1", [headers])

    # Formattazione opzionale: intestazioni in grassetto
    # ws.format("A1:Z1", {
        # "textFormat": {"bold": True},
        # "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.2},
    # })

    logging.info(f"Table '{title}' ready with {len(headers)} columns.")


# ──────────────────────────────────────────────
# 5. Execution
# ──────────────────────────────────────────────
logging.info("\nConfiguring tables...\n")

for table_name, config in TABLES.items():
    setup_worksheet(
        spreadsheet=sh,
        title=table_name,
        headers=config["headers"],
        rows=config["rows"],
    )

logging.info("\nDatabase configuration completed!")
logging.info(f"URL: https://docs.google.com/spreadsheets/d/{sh.id}")