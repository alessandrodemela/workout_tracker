from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Exercise(BaseModel):
    ID_Exercise: Optional[int] = None
    Exercise_Name: str
    Target_Muscle: Optional[str] = ""
    Target_Area: Optional[str] = ""
    Equipment: Optional[str] = ""
    Notes: Optional[str] = ""

class WorkoutRow(BaseModel):
    Exercise: str
    Kg: Optional[float] = 0.0
    Sets: str
    Reps: str
    RPE: Optional[float] = 8.0

class WorkoutSession(BaseModel):
    Date: str
    Session_Type: str
    Mesocycle: Optional[str] = None
    Notes: Optional[str] = ""
    Exercises: List[WorkoutRow]

class FunctionalSession(BaseModel):
    Date: str
    Session_Type: str
    Exercise: str = "Functional Circuit"
    Notes: str

class WorkoutTemplate(BaseModel):
    ID: str  # Concat of week, meso, split, ex_num
    Week_Number: int
    Mesocycle: str
    Split: str
    Exercise_Number: int
    Exercise_Name: str
    Sets: str
    Reps: str
    RPE: Optional[float] = None
    Notes: Optional[str] = ""
