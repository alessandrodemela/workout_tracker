from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import Exercise, WorkoutSession, FunctionalSession
from database import read_sheet_to_df, append_to_sheet_via_df
import pandas as pd
from datetime import datetime

app = FastAPI(title="Workout Tracker API")

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/exercises")
def get_exercises():
    try:
        df = read_sheet_to_df("dim_exercises")
        if "Exercise_Name" in df.columns:
            # Drop duplicates and sort
            exercises = sorted(df["Exercise_Name"].dropna().unique().tolist())
            return {"exercises": exercises, "full_list": df.to_dict(orient="records")}
        return {"exercises": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/exercises")
def add_exercise(exercise: Exercise):
    try:
        new_df = pd.DataFrame([exercise.dict(exclude_none=True)])
        append_to_sheet_via_df("dim_exercises", new_df)
        return {"status": "success", "message": "Exercise added"}
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
        df1 = read_sheet_to_df("fact_workout_logs")
        df2 = read_sheet_to_df("fact_functional_logs")
        
        history = {}
        if not df1.empty:
            history["workouts"] = df1.to_dict(orient="records")
        if not df2.empty:
            history["functional"] = df2.to_dict(orient="records")
            
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
