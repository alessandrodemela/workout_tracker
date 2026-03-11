from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import Exercise, WorkoutSession, FunctionalSession, WorkoutTemplate
from database import read_sheet_to_df, append_to_sheet_via_df, get_worksheet
import pandas as pd
from datetime import datetime
from typing import Optional, List

app = FastAPI(title="Workout Tracker API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now, we can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/exercises")
def get_exercises():
    try:
        df = read_sheet_to_df("dim_exercises")
        if "Exercise_Name" in df.columns:
            exercises = sorted(df["Exercise_Name"].dropna().unique().tolist())
            return {"exercises": exercises, "full_list": df.to_dict(orient="records")}
        return {"exercises": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/exercises/{exercise_name}/history")
def get_exercise_history(exercise_name: str):
    try:
        df = read_sheet_to_df("fact_workout_logs")
        if df.empty:
            return {"history": [], "pb": None}
            
        ex_df = df[df["Exercise"].str.lower() == exercise_name.lower()]
        if ex_df.empty:
             return {"history": [], "pb": None}
             
        history = ex_df.to_dict(orient="records")
        # Calculate PB: max weight, if tie, max reps
        # Sets are stored as string, Kg as float
        pb = None
        current_max_kg = -1
        for log in history:
            kg = float(log.get("Kg", 0))
            if kg > current_max_kg:
                current_max_kg = kg
                pb = log
        
        return {"history": history, "pb": pb}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates")
def get_templates():
    try:
        df = read_sheet_to_df("dim_workout_templates")
        if df.empty:
            return {"templates": []}
        
        # We might want to group them or just return the list
        templates = df.to_dict(orient="records")
        return {"templates": templates}
    except Exception as e:
        if "not found" in str(e).lower() or "404" in str(e):
             return {"templates": []}
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/templates/map-exercises")
def map_template_exercises(mapping: dict):
    # mapping is { "Old Name": "New Name" }
    try:
        from database import read_sheet_to_df, update_sheet_df
        df = read_sheet_to_df("dim_workout_templates")
        if df.empty:
            return {"status": "success", "message": "No templates to update"}
        
        has_updates = False
        for old, new in mapping.items():
            if (df["Exercise_Name"] == old).any():
                df.loc[df["Exercise_Name"] == old, "Exercise_Name"] = new
                has_updates = True
        
        if has_updates:
            update_sheet_df("dim_workout_templates", df)
            
        return {"status": "success", "message": f"Updated {has_updates}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from typing import Optional, List

@app.post("/exercises")
def add_exercise(exercise: Exercise):
    try:
        new_df = pd.DataFrame([exercise.dict(exclude_none=True)])
        append_to_sheet_via_df("dim_exercises", new_df)
        return {"status": "success", "message": "Exercise added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/exercises/bulk")
def add_exercises_bulk(exercises: List[Exercise]):
    try:
        data = [ex.dict(exclude_none=True) for ex in exercises]
        new_df = pd.DataFrame(data)
        append_to_sheet_via_df("dim_exercises", new_df)
        return {"status": "success", "message": f"{len(exercises)} exercises added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workout-session")
def add_workout_session(session: WorkoutSession):
    try:
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        data = []
        date_obj = datetime.strptime(session.Date, '%Y-%m-%d')
        week_num = date_obj.isocalendar()[1]

        for ex in session.Exercises:
            data.append({
                "Date": session.Date,
                "Week": week_num,
                "Session_Type": session.Session_Type,
                "Mesocycle": session.Mesocycle,
                "Exercise": ex.Exercise,
                "Kg": ex.Kg,
                "Sets": ex.Sets,
                "Reps": ex.Reps,
                "RPE": ex.RPE,
                "Notes": session.Notes,
                "upload_processed_at": now_str
            })
            
        new_df = pd.DataFrame(data)
        append_to_sheet_via_df("fact_workout_logs", new_df)
        return {"status": "success", "message": "Workout session logged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/functional-session")
def add_functional_session(session: FunctionalSession):
    try:
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        date_obj = datetime.strptime(session.Date, '%Y-%m-%d')
        week_num = date_obj.isocalendar()[1]
        
        data = [{
            "Date": session.Date,
            "Week": week_num,
            "Session_Type": session.Session_Type,
            "Exercise": session.Exercise,
            "Notes": session.Notes,
            "upload_processed_at": now_str
        }]
        
        new_df = pd.DataFrame(data)
        append_to_sheet_via_df("fact_functional_logs", new_df)
        return {"status": "success", "message": "Functional session logged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workout-history")
def get_workout_history():
    try:
        df_logs = read_sheet_to_df("fact_workout_logs")
        df_functional = read_sheet_to_df("fact_functional_logs")
        df_exercises = read_sheet_to_df("dim_exercises")
        
        history = {"workouts": [], "functional": []}
        
        if not df_logs.empty:
            # Merge with exercises to get Target_Muscle
            if not df_exercises.empty:
                # Standardize columns for merging
                df_logs['Exercise_Upper'] = df_logs['Exercise'].str.upper()
                df_exercises['Exercise_Name_Upper'] = df_exercises['Exercise_Name'].str.upper()
                
                merged_df = pd.merge(
                    df_logs, 
                    df_exercises[['Exercise_Name_Upper', 'Target_Muscle']], 
                    left_on='Exercise_Upper', 
                    right_on='Exercise_Name_Upper', 
                    how='left'
                )
                # Drop temporary columns
                merged_df = merged_df.drop(columns=['Exercise_Upper', 'Exercise_Name_Upper'])
                history["workouts"] = merged_df.to_dict(orient="records")
            else:
                history["workouts"] = df_logs.to_dict(orient="records")
                
        if not df_functional.empty:
            history["functional"] = df_functional.to_dict(orient="records")
            
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
