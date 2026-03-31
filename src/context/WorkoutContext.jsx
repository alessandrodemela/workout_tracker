import React, { createContext, useContext, useState, useEffect } from 'react';

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
    const [isActive, setIsActive] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionType, setSessionType] = useState('Standard');
    const [exercises, setExercises] = useState([]);
    const [globalNotes, setGlobalNotes] = useState('');
    const [secondsElapsed, setSecondsElapsed] = useState(0);

    useEffect(() => {
        let interval;
        if (isActive) {
            interval = setInterval(() => {
                setSecondsElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    const startWorkout = (initialData = {}) => {
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setSessionType(initialData.sessionType || 'Standard');
        setExercises(initialData.exercises || []);
        setGlobalNotes(initialData.globalNotes || '');
        setSecondsElapsed(initialData.secondsElapsed || 0);
        setIsActive(true);
    };

    const cancelWorkout = () => {
        setIsActive(false);
        setExercises([]);
        setSecondsElapsed(0);
        setGlobalNotes('');
    };

    const finishWorkout = () => {
        setIsActive(false);
        setExercises([]);
        setSecondsElapsed(0);
        setGlobalNotes('');
    };

    const updateExercises = (newExercises) => {
        setExercises(newExercises);
    };

    const addExercise = (exerciseName) => {
        setExercises(prev => [...prev, { name: exerciseName, sets: [{ kg: '', reps: '', rpe: 8, completed: false }] }]);
    };

    return (
        <WorkoutContext.Provider value={{
            isActive,
            setIsActive,
            date,
            setDate,
            sessionType,
            setSessionType,
            exercises,
            setExercises: updateExercises,
            addExercise,
            globalNotes,
            setGlobalNotes,
            secondsElapsed,
            setSecondsElapsed,
            startWorkout,
            cancelWorkout,
            finishWorkout
        }}>
            {children}
        </WorkoutContext.Provider>
    );
}

export function useWorkout() {
    return useContext(WorkoutContext);
}
