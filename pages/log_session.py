import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
from datetime import datetime

conn = st.connection("gsheets", type=GSheetsConnection)
SHEET_URL = st.secrets["connections"]["gsheets"]["spreadsheet"]

# 1. LETTURA CACHEATA
@st.cache_data(ttl=600)
def get_exercise_list():
    df_dim = conn.read(spreadsheet=SHEET_URL, worksheet="dim_exercises")
    return sorted(df_dim["Exercise_Name"].unique().tolist())

# 2. CONTROLLO REFRESH (Svuota la cache se abbiamo aggiunto un esercizio)
if st.session_state.get("needs_refresh", False):
    st.cache_data.clear()
    st.session_state.needs_refresh = False

try:
    available_exercises = get_exercise_list()
except:
    available_exercises = ["Please add exercises to Master DB first"]

# --- STATE MANAGEMENT ---
if "form_id" not in st.session_state:
    st.session_state.form_id = 0

if "workout_rows" not in st.session_state:
    st.session_state.workout_rows = [{"ex": "", "kg": 0.0, "sets": "", "reps": "", "rpe": 8}]

def add_exercise():
    st.session_state.workout_rows.append({"ex": "", "kg": 0.0, "sets": "", "reps": "", "rpe": 8})

def remove_exercise(index):
    if len(st.session_state.workout_rows) > 1:
        st.session_state.workout_rows.pop(index)
    else:
        st.session_state.workout_rows = [{"ex": "", "kg": 0.0, "sets": "", "reps": "", "rpe": 8}]

# --- SIDEBAR ---
st.sidebar.header("⚙️ Session Settings")
meso = None # st.sidebar.selectbox("Mesocycle", ["Meso 1 - Recomposition", "Meso 2 - Strength"])
session_type = None # st.sidebar.selectbox("Type", ["A (Standard Gym)", "B (Office Gym)", "Functional", "Extra/Spot"])
workout_date = st.sidebar.date_input("Date", datetime.now())

st.title("🏋️ Workout Session Log")
st.subheader("Current Session Exercises")

# --- INTERFACCIA DINAMICA ---
for i, row in enumerate(st.session_state.workout_rows):
    with st.container():
        c1, c2, c3, c4, c5, c6 = st.columns([3, 1, 1, 1, 1, 0.5])
        
        fid = st.session_state.form_id
        
        # --- FIX SELECTBOX: Troviamo l'indice corretto ---
        try:
            current_index = available_exercises.index(row['ex'])
        except ValueError:
            current_index = 0

        # Assegniamo la selectbox con l'indice dinamico
        selected_ex = c1.selectbox(
            "Exercise Name", 
            options=available_exercises, 
            index=current_index, 
            key=f"ex_{fid}_{i}"
        )
        # Aggiorniamo subito lo stato con il valore scelto
        st.session_state.workout_rows[i]['ex'] = selected_ex
        
        # Resto dei campi
        st.session_state.workout_rows[i]['kg'] = c2.number_input("Kg", value=int(row['kg']), step=1, key=f"kg_{fid}_{i}")
        st.session_state.workout_rows[i]['sets'] = c3.text_input("Sets", value=row['sets'], key=f"sets_{fid}_{i}")
        st.session_state.workout_rows[i]['reps'] = c4.text_input("Reps", value=row['reps'], key=f"reps_{fid}_{i}")
        st.session_state.workout_rows[i]['rpe'] = c5.number_input("RPE", 1, 10, value=int(row['rpe']), key=f"rpe_{fid}_{i}")
        
        if c6.button("🗑️", key=f"del_{fid}_{i}"):
            remove_exercise(i)
            st.session_state.form_id += 1
            st.rerun()

st.button("➕ Add Another Exercise", on_click=add_exercise)

st.divider()
global_notes = st.text_area("Session Notes (Fatigue, Focus, Recovery)", key=f"notes_{st.session_state.form_id}")

# --- SAVE LOGIC ---
if st.button("💾 FINALIZE & SAVE SESSION", type="primary"):
    if not st.session_state.workout_rows[0]['ex']:
        st.error("Please add at least one exercise.")
    else:
        df_new = pd.DataFrame(st.session_state.workout_rows)
        
        # Validazione rigorosa
        is_valid = (
            (df_new['ex'].str.strip() != "").all() and 
            (df_new['sets'].str.strip() != "").all() and 
            (df_new['reps'].str.strip() != "").all()
        )

        if not is_valid:
            st.error("⚠️ All fields (Exercise, Sets, Reps) are mandatory for each row!")
        else:
            with st.spinner("Writing to database..."):
                try:
                    df_new['Date'] = workout_date.strftime('%Y-%m-%d')
                    df_new['Mesocycle'] = meso
                    df_new['Session_Type'] = session_type
                    df_new['Notes'] = global_notes
                    df_new['upload_processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    df_new = df_new.rename(columns={'ex': 'Exercise', 'kg': 'Kg', 'sets': 'Sets', 'reps': 'Reps', 'rpe': 'RPE'})

                    existing_df = conn.read(spreadsheet=SHEET_URL, worksheet="fact_workout_logs", ttl=0)
                    updated_df = pd.concat([existing_df, df_new], ignore_index=True)
                    conn.update(spreadsheet=SHEET_URL, worksheet="fact_workout_logs", data=updated_df)

                    st.success("Workout saved successfully!")
                    st.balloons()

                    # Reset pulito
                    st.session_state.form_id += 1
                    st.session_state.workout_rows = [{"ex": "", "kg": 0.0, "sets": "", "reps": "", "rpe": 8}]
                    
                    st.rerun()

                except Exception as e:
                    st.error(f"Error: {e}")