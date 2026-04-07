import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
    const [isActive, setIsActive] = useState(undefined);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionType, setSessionType] = useState('Standard');
    const [exercises, setExercises] = useState([]);
    const [globalNotes, setGlobalNotes] = useState('');
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [restTimer, setRestTimer] = useState({ isActive: false, secondsRemaining: 0, duration: 0 });
    const [isRestTimerExpanded, setIsRestTimerExpanded] = useState(false);
    useEffect(() => {
        if (isActive === undefined) {
            setIsActive(false);
        }
    }, [isActive]);
    useEffect(() => {
        if (isActive && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [isActive]);

    useEffect(() => {
        let interval;
        if (isActive) {
            interval = setInterval(() => {
                setSecondsElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    const audioContextRef = useRef(null);

    const playBeep = (freq = 880, duration = 0.5) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const audioCtx = audioContextRef.current;
            
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error("Audio context failed", e);
        }
    };

    const showNotification = () => {
        if (Notification.permission === 'granted') {
            new Notification('Rest Timer Finished!', {
                body: 'Time to start your next set!',
                icon: '/logo192.png' // Adjust if needed
            });
        }
    };

    useEffect(() => {
        let interval;
        if (restTimer.isActive && restTimer.secondsRemaining > 0) {
            interval = setInterval(() => {
                setRestTimer(prev => {
                    const nextValue = Math.max(0, prev.secondsRemaining - 1);
                    
                    if (nextValue > 0 && nextValue <= 3) {
                        playBeep(440, 0.2); // Low beep for countdown
                    }

                    if (nextValue === 0 && prev.isActive) {
                        playBeep(880, 0.8); // High beep for end
                        showNotification();
                    }

                    return {
                        ...prev,
                        secondsRemaining: nextValue,
                        isActive: nextValue > 0
                    };
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [restTimer.isActive, restTimer.secondsRemaining]);

    const startRestTimer = useCallback((seconds) => {
        playBeep(); // Minimal sound to 'unlock' context on user gesture
        setRestTimer({
            isActive: true,
            secondsRemaining: seconds,
            duration: seconds
        });
    }, []);

    const stopRestTimer = useCallback(() => {
        setRestTimer({
            isActive: false,
            secondsRemaining: 0,
            duration: 0
        });
    }, []);

    const addRestTime = useCallback((seconds) => {
        setRestTimer(prev => ({
            ...prev,
            secondsRemaining: prev.secondsRemaining + seconds
        }));
    }, []);

    const startWorkout = useCallback((initialData = {}) => {
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setSessionType(initialData.sessionType || 'Standard');
        setExercises(initialData.exercises || []);
        setGlobalNotes(initialData.globalNotes || '');
        setSecondsElapsed(initialData.secondsElapsed || 0);
        setIsActive(true);
    }, []);

    const cancelWorkout = useCallback(() => {
        setIsActive(false);
        setExercises([]);
        setSecondsElapsed(0);
        setGlobalNotes('');
        stopRestTimer();
    }, [stopRestTimer]);

    const finishWorkout = useCallback(() => {
        setIsActive(false);
        setExercises([]);
        setSecondsElapsed(0);
        setGlobalNotes('');
    }, []);

    const updateExercises = useCallback((newExercises) => {
        setExercises(newExercises);
    }, []);

    const addExercise = useCallback((exerciseName) => {
        setExercises(prev => [...prev, { name: exerciseName, sets: [{ kg: '', reps: '', rpe: 8, completed: false }] }]);
    }, []);

    const value = useMemo(() => ({
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
        restTimer,
        startRestTimer,
        stopRestTimer,
        addRestTime,
        isRestTimerExpanded,
        setIsRestTimerExpanded,
        startWorkout,
        cancelWorkout,
        finishWorkout
    }), [
        isActive, date, sessionType, exercises, globalNotes, 
        secondsElapsed, restTimer, isRestTimerExpanded,
        updateExercises, addExercise, startRestTimer, 
        stopRestTimer, addRestTime, startWorkout, 
        cancelWorkout, finishWorkout
    ]);

    return (
        <WorkoutContext.Provider value={value}>
            {children}
        </WorkoutContext.Provider>
    );
}

export function useWorkout() {
    return useContext(WorkoutContext);
}
