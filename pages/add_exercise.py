import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd

conn = st.connection("gsheets", type=GSheetsConnection)
SHEET_URL = st.secrets["connections"]["gsheets"]["spreadsheet"]

st.title("📝 Exercise Master Database")
st.subheader("Add a new exercise to the catalog")

with st.form("add_exercise_form", clear_on_submit=True):
    col1, col2 = st.columns(2)
    
    with col1:
        ex_name = st.text_input("Exercise Name", placeholder="e.g. Incline Bench Press")
        muscle_group = st.radio("Muscle Group", ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core"], horizontal=True)
        target_area = st.radio("Target Area", ["Upper Body", "Lower Body"], horizontal=True)
    
    with col2:
        equipment = st.multiselect("Equipment", ["Barbell", "Dumbbells", "Bench", "Cable", "Machine", "Bodyweight"])
        bio_notes = st.text_area("Biomechanical Notes")

    submitted = st.form_submit_state = st.form_submit_button("💾 Save to Master Database")

if submitted:
    # --- VALIDATION CHECK ---
    # Verifichiamo che ex_name non sia vuoto e che sia stata selezionata almeno un'attrezzatura
    # (Radio buttons hanno sempre un valore di default, quindi sono 'sicuri')
    if not ex_name.strip():
        st.error("⚠️ Exercise Name is mandatory!")
    elif not equipment:
        st.error("⚠️ Please select at least one piece of Equipment!")
    else:
        # Se passa i controlli, procediamo all'upload
        try:
            with st.spinner("Updating Master Database..."):
                # 1. Prep data
                new_ex = pd.DataFrame([{
                    "ID_Exercise": ex_name.upper().replace(" ", "_")[:10],
                    "Exercise_Name": ex_name,
                    "Target_Muscle": muscle_group,
                    "Target_Area": target_area,
                    "Equipment" : ', '.join(equipment),
                    "Notes": bio_notes
                }])

                # 2. Append Logic
                existing_dim = conn.read(spreadsheet=SHEET_URL, worksheet="dim_exercises", ttl=0)
                updated_dim = pd.concat([existing_dim, new_ex], ignore_index=True)
                
                conn.update(spreadsheet=SHEET_URL, worksheet="dim_exercises", data=updated_dim)
                
                st.success(f"✅ Exercise '{ex_name}' added to Master List!")
                st.balloons()


                st.session_state.needs_refresh = True
                
                # Forziamo il refresh per vedere l'esercizio nella tabella sotto
                st.rerun()
                
        except Exception as e:
            st.error(f"❌ Error: {e}")
# Mostra il DB attuale sotto la maschera
st.divider()
st.write("### Current Exercise List")
# Usiamo ttl=0 se abbiamo appena aggiunto qualcosa, altrimenti 10m
current_ttl = 0 if st.session_state.get("needs_refresh", False) else "10m"
dim_data = conn.read(spreadsheet=SHEET_URL, worksheet="dim_exercises", ttl=current_ttl)
st.dataframe(dim_data, width='content')