# Workout Tracker (PWA + FastAPI)

This project has been migrated from Streamlit to a modern mobile-first Progressive Web App (React + Vite) with a Python FastAPI backend.

## Architecture
- **Frontend**: React + Vite (PWA)
- **Backend**: Python + FastAPI
- **Database**: Google Sheets (via `gspread` and `pandas`)

## Minimal Requirements
- **Node.js**: (v16+ for npm and vite)
- **Python**: (3.9+)

## Setup the Backend
1. Go into the backend repository:
   ```bash
   cd backend
   ```
2. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your actual SpreadSheet URL (taken from your old `.streamlit/secrets.toml`). Ensure the service account `gym-performance-tracker-489013-6dc15c8cd668.json` is located in the root folder, or update the path in `.env`.
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   (The backend will be running at `http://localhost:8000`)

## Setup the Frontend
1. Go into the frontend repository:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   (The frontend will be running at `http://localhost:3000`)

## Windows Corporate Setup (Node.js Portable)

Se sei su un computer aziendale con restrizioni, usa lo script `setup_node.ps1` per configurare il terminale:

1. Apri una nuova **PowerShell**.
2. Esegui lo script:
   ```powershell
   . .\setup_node.ps1
   ```
   *(Nota il punto iniziale `. ` che serve per mantenere le variabili d'ambiente nella sessione corrente).*

3. Ora puoi lanciare i comandi normalmente:
   - **Backend**: `cd backend; uvicorn main:app --reload`
   - **Frontend**: `cd frontend; npm run dev`

### Comandi Manuali (Senza script)
Se preferisci non usare lo script, esegui questi comandi per ogni nuova finestra:
```powershell
Set-ExecutionPolicy Bypass -Scope Process
$NODE_PATH = "C:\Users\DemelaA\OneDrive - Vodafone Group\Documents\PERSONAL\node_portable"
$env:Path = "$NODE_PATH;$env:Path"
```
