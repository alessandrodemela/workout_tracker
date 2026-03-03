import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
from datetime import datetime

conn = st.connection("gsheets", type=GSheetsConnection)
SHEET_URL = st.secrets["connections"]["gsheets"]["spreadsheet"]

# --- REFRESH LOGIC ---
if "refresh_counter" not in st.session_state:
    st.session_state.refresh_counter = 0

if st.session_state.get("needs_refresh", False):
    st.session_state.refresh_counter += 1
    st.session_state.needs_refresh = False

@st.cache_data(ttl=600)
def get_exercise_list(counter):
    # Se il counter è > 0, forziamo ttl=0 per questa lettura specifica
    ttl_to_use = 0 if counter > 0 else 600
    df_dim = conn.read(spreadsheet=SHEET_URL, worksheet="dim_exercises", ttl=ttl_to_use)
    return sorted(df_dim["Exercise_Name"].unique().tolist())

try:
    available_exercises = get_exercise_list(st.session_state.refresh_counter)
except Exception as e:
    st.error(f"⚠️ Error loading exercises: {e}")
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

# --- CSS per le card degli esercizi ---
st.markdown("""
<style>
    /* Card esercizio */
    div[data-testid="stVerticalBlock"] > div.exercise-card {
        border-left: 4px solid #FF4B4B;
        background-color: rgba(255, 75, 75, 0.04);
        border-radius: 0 8px 8px 0;
        padding: 0.5rem;
        margin-bottom: 0.75rem;
    }
    /* Header esercizio */
    .exercise-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.3rem 0.5rem;
        margin-bottom: 0.25rem;
        background: linear-gradient(90deg, rgba(255,75,75,0.12) 0%, transparent 100%);
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.95rem;
        color: #FF4B4B;
    }
    /* Badge numero */
    .exercise-badge {
        background-color: #FF4B4B;
        color: white;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 700;
        margin-right: 8px;
    }
</style>
""", unsafe_allow_html=True)

# --- INTERFACCIA DINAMICA ---
for i, row in enumerate(st.session_state.workout_rows):
    # Header della card con numero e nome
    exercise_label = row['ex'] if row['ex'] else "Select exercise..."
    st.markdown(
        f'<div class="exercise-header">'
        f'<span><span class="exercise-badge">#{i+1}</span> {exercise_label}</span>'
        f'</div>',
        unsafe_allow_html=True
    )
    
    with st.container(border=True):
        fid = st.session_state.form_id
        
        # Prima riga: Exercise Name + Delete
        col_ex, col_del = st.columns([6, 0.5])
        
        # --- FIX SELECTBOX: Troviamo l'indice corretto ---
        try:
            current_index = available_exercises.index(row['ex'])
        except ValueError:
            current_index = 0

        # Assegniamo la selectbox con l'indice dinamico
        selected_ex = col_ex.selectbox(
            "Exercise Name", 
            options=available_exercises, 
            index=current_index, 
            key=f"ex_{fid}_{i}",
            label_visibility="collapsed"
        )
        # Aggiorniamo subito lo stato con il valore scelto
        st.session_state.workout_rows[i]['ex'] = selected_ex
        
        if col_del.button("🗑️", key=f"del_{fid}_{i}", help="Remove this exercise"):
            remove_exercise(i)
            st.session_state.form_id += 1
            st.rerun()

        # Seconda riga: Kg, Sets, Reps, RPE
        c_kg, c_sets, c_reps, c_rpe = st.columns(4)
        st.session_state.workout_rows[i]['kg'] = c_kg.number_input("Kg 🏋️", value=int(row['kg']), step=1, key=f"kg_{fid}_{i}")
        st.session_state.workout_rows[i]['sets'] = c_sets.text_input("Sets 📊", value=row['sets'], key=f"sets_{fid}_{i}")
        st.session_state.workout_rows[i]['reps'] = c_reps.text_input("Reps 🔁", value=row['reps'], key=f"reps_{fid}_{i}")
        st.session_state.workout_rows[i]['rpe'] = c_rpe.number_input("RPE 💪", 1, 10, value=int(row['rpe']), key=f"rpe_{fid}_{i}")

st.button("➕ Add Another Exercise", on_click=add_exercise, type="secondary", use_container_width=True)

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