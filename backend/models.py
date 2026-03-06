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
    Kg: float
    Sets: str
    Reps: str
    RPE: int

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
