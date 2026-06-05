import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';

const WorkoutContext = createContext();

export function WorkoutProvider({ children }) {
    // isActive is always a boolean — no undefined state that causes black screens on iOS
    const [isActive, setIsActive] = useState(false);
    // isContextReady flips true synchronously on first layout, giving consumers a reliable gate
    const [isContextReady, setIsContextReady] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionType, setSessionType] = useState('Standard');
    const [exercises, setExercises] = useState([]);
    const [globalNotes, setGlobalNotes] = useState('');
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [manualDuration, setManualDuration] = useState(''); // persisted across navigation in log mode
    const [isDurationLocked, setIsDurationLocked] = useState(false); // true when duration comes from a real timer
    const [restTimer, setRestTimer] = useState({ isActive: false, secondsRemaining: 0, duration: 0 });
    const [isRestTimerExpanded, setIsRestTimerExpanded] = useState(false);
    // Log mode: if true, timer does NOT tick (retroactive session logging)
    const [isLogMode, setIsLogMode] = useState(false);
    const [runningTime, setRunningTime] = useState('');
    const [runningDistance, setRunningDistance] = useState('');

    // Use useLayoutEffect so isContextReady is true before the first paint
    useLayoutEffect(() => {
        setIsContextReady(true);
    }, []);

    useEffect(() => {
        if (isActive && typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [isActive]);

    useEffect(() => {
        let interval;
        // Only tick when active AND not in log mode
        if (isActive && !isLogMode) {
            interval = setInterval(() => {
                setSecondsElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, isLogMode]);

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
        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('Rest Timer Finished!', {
                    body: 'Time to start your next set!',
                    icon: '/logo192.png'
                });
            }
        } catch (e) {
            console.warn('Notification API not available:', e);
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
        const logMode = initialData.isLog ?? false;
        setIsLogMode(logMode);
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setSessionType(initialData.sessionType || 'Standard');
        setExercises(initialData.exercises || []);
        setGlobalNotes(initialData.globalNotes || '');
        setSecondsElapsed(initialData.secondsElapsed || 0);
        // Pre-fill manualDuration if provided (e.g. from conditioning timer handoff)
        if (initialData.prefillDuration !== undefined) {
            setManualDuration(String(Math.round(initialData.prefillDuration / 60)));
            setIsDurationLocked(true);
        } else {
            setIsDurationLocked(false);
        }
        // In log mode we still set isActive=true so the UI renders, but the timer won't tick
        setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
    }, []);

    const cancelWorkout = useCallback(() => {
        setIsActive(false);
        setIsLogMode(false);
        setIsDurationLocked(false);
        setExercises([]);
        setSecondsElapsed(0);
        setManualDuration('');
        setGlobalNotes('');
        setRunningTime('');
        setRunningDistance('');
        stopRestTimer();
    }, [stopRestTimer]);

    const finishWorkout = useCallback(() => {
        setIsActive(false);
        setIsLogMode(false);
        setIsDurationLocked(false);
        setExercises([]);
        setSecondsElapsed(0);
        setManualDuration('');
        setGlobalNotes('');
        setRunningTime('');
        setRunningDistance('');
    }, []);

    const updateExercises = useCallback((newExercises) => {
        setExercises(newExercises);
    }, []);

    const addExercise = useCallback((exerciseName) => {
        setExercises(prev => [...prev, { name: exerciseName, sets: [{ kg: '', reps: '', rpe: 8, completed: false }] }]);
    }, []);

    const value = useMemo(() => ({
        isActive,
        isContextReady,
        setIsActive,
        isLogMode,
        isDurationLocked,
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
        manualDuration,
        setManualDuration,
        restTimer,
        startRestTimer,
        stopRestTimer,
        addRestTime,
        isRestTimerExpanded,
        setIsRestTimerExpanded,
        startWorkout,
        cancelWorkout,
        finishWorkout,
        runningTime,
        setRunningTime,
        runningDistance,
        setRunningDistance
    }), [
        isActive, isContextReady, isLogMode, isDurationLocked, date, sessionType, exercises, globalNotes,
        secondsElapsed, manualDuration, restTimer, isRestTimerExpanded,
        updateExercises, addExercise, startRestTimer,
        stopRestTimer, addRestTime, startWorkout,
        cancelWorkout, finishWorkout, runningTime, runningDistance
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
