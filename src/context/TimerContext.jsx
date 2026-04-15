import React, { createContext, useContext, useState, useEffect } from 'react';

const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

export const TimerProvider = ({ children }) => {
    const [config, setConfig] = useState({
        circuit: { prepareTime: 10, workTime: 40, restTime: 20, rounds: 4, cycles: 3, cycleRestTime: 60 },
        emom: { prepareTime: 10, workTime: 60, restTime: 0, rounds: 10, cycles: 1, cycleRestTime: 0 },
        amrap: { prepareTime: 10, workTime: 600, restTime: 0, rounds: 1, cycles: 1, cycleRestTime: 0 },
        tabata: { prepareTime: 10, workTime: 20, restTime: 10, rounds: 8, cycles: 1, cycleRestTime: 0 }
    });

    const [isConfiguring, setIsConfiguring] = useState(true);
    const [activeTimerMode, setActiveTimerMode] = useState(null); // 'circuit', 'emom', 'amrap', 'tabata'
    const [phase, setPhase] = useState('Idle'); // Idle, Prepare, Work, Rest, CycleRest, Done
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [currentCycle, setCurrentCycle] = useState(1);
    const [isActive, setIsActive] = useState(false);
    const [timerExercises, setTimerExercises] = useState([]); // Pre-selected exercises for guidance
    const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0); // Total time the timer has been running

    const activeConfig = activeTimerMode ? config[activeTimerMode] : config.circuit;

    const updateConfig = (key, value) => {
        if (!activeTimerMode) return;
        
        let minValue = 0;
        if (key === 'workTime') minValue = 5; // at least 5s of work
        if (key === 'rounds') minValue = 1; // at least 1 round
        if (key === 'cycles') minValue = 1; // at least 1 cycle
        if (key === 'cycleRestTime') minValue = 5; // at least 5s cycle rest if applicable
        
        setConfig(prev => ({
            ...prev,
            [activeTimerMode]: {
                ...prev[activeTimerMode],
                [key]: Math.max(minValue, value)
            }
        }));
    };

    const audioContextRef = React.useRef(null);

    const playBeep = (freq = 880, type = 'sine', duration = 0.5) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const context = audioContextRef.current;
            
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.type = type;
            oscillator.frequency.value = freq;
            gain.gain.setValueAtTime(1.0, context.currentTime); // LOUDER
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

            // Resuming happens asynchronously, but we can start the oscillator anyway
            if (context.state === 'suspended') {
                context.resume().then(() => {
                    oscillator.start(context.currentTime);
                    oscillator.stop(context.currentTime + duration);
                });
            } else {
                oscillator.start(context.currentTime);
                oscillator.stop(context.currentTime + duration);
            }
        } catch (err) {
            console.warn('Audio playback failed', err);
        }
    };

    const handleNextPhase = () => {
        if (phase === 'Idle' || phase === 'Done') return;

        // Final phase completion beep (higher pitch)
        playBeep(880, 'sine', 0.8);

        if (phase === 'Prepare') {
            setPhase('Work');
            setTimeLeft(activeConfig.workTime);
        } else if (phase === 'Work') {
            if (currentRound < activeConfig.rounds && activeConfig.restTime > 0) {
                setPhase('Rest');
                setTimeLeft(activeConfig.restTime);
            } else if (currentRound < activeConfig.rounds && activeConfig.restTime === 0) {
                // Skip the rest phase if 0, immediately start next Work round (e.g. EMOM)
                setCurrentRound(prev => prev + 1);
                setPhase('Work');
                setTimeLeft(activeConfig.workTime);
            } else if (currentCycle < activeConfig.cycles && activeConfig.cycleRestTime > 0) {
                setPhase('CycleRest');
                setTimeLeft(activeConfig.cycleRestTime);
            } else if (currentCycle < activeConfig.cycles && activeConfig.cycleRestTime === 0) {
                // Skip cycle rest if 0
                setCurrentCycle(prev => prev + 1);
                setCurrentRound(1);
                setPhase('Work');
                setTimeLeft(activeConfig.workTime);
            } else {
                setPhase('Done');
                setIsActive(false);
            }
        } else if (phase === 'Rest') {
            setCurrentRound(prev => prev + 1);
            setPhase('Work');
            setTimeLeft(activeConfig.workTime);
        } else if (phase === 'CycleRest') {
            setCurrentCycle(prev => prev + 1);
            setCurrentRound(1);
            setPhase('Work');
            setTimeLeft(activeConfig.workTime);
        }
    };

    const skipPhase = () => {
        if (phase === 'Idle' || phase === 'Done') return;
        handleNextPhase();
    };

    const startTimer = (exercises = []) => {
        if (exercises.length > 0) setTimerExercises(exercises);
        playBeep(440, 'sine', 0.001); // Unlock audio context on user gesture
        setIsConfiguring(false);
        setPhase('Prepare');
        setTimeLeft(activeConfig.prepareTime);
        setCurrentRound(1);
        setCurrentCycle(1);
        setIsActive(true);
    };

    // Derive current and next exercise from the round index (wraps around if needed)
    const currentExercise = timerExercises.length > 0
        ? timerExercises[(currentRound - 1) % timerExercises.length]
        : null;
    const nextExercise = timerExercises.length > 0
        ? timerExercises[currentRound % timerExercises.length]
        : null;

    const pauseTimer = () => setIsActive(false);
    const resumeTimer = () => {
        playBeep(440, 'sine', 0.001); // Re-unlock on resume
        setIsActive(true);
    };
    const stopTimer = () => {
        setIsActive(false);
        setPhase('Idle');
        setIsConfiguring(true);
        setTotalElapsedSeconds(0);
    };

    useEffect(() => {
        let interval;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev - 1;
                    if (next > 0 && next <= 3) {
                        playBeep(440, 'sine', 0.2); // Low frequency for countdown
                    }
                    return next;
                });
                setTotalElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            handleNextPhase();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, phase, currentRound, currentCycle, activeConfig]);

    const value = {
        config: activeConfig, updateConfig, isConfiguring, setIsConfiguring,
        activeTimerMode, setActiveTimerMode,
        phase, setPhase, timeLeft, setTimeLeft, currentRound, setCurrentRound,
        currentCycle, setCurrentCycle, isActive, setIsActive,
        startTimer, pauseTimer, resumeTimer, stopTimer, skipPhase,
        timerExercises, setTimerExercises, currentExercise, nextExercise,
        totalElapsedSeconds
    };

    return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};
