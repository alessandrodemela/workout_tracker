import streamlit as st

# Configurazione globale (deve essere la prima istruzione)
st.set_page_config(page_title="Workout Performance Hub", layout="wide")

if "needs_refresh" not in st.session_state:
    st.session_state.needs_refresh = False

# Definiamo le pagine
log_page = st.Page("pages/log_session.py", title="Log Workout Session", icon="🏋️")
add_ex_page = st.Page("pages/add_exercise.py", title="Add New Exercise to DB", icon="📝")

# Navigazione
pg = st.navigation([log_page, add_ex_page])
pg.run()