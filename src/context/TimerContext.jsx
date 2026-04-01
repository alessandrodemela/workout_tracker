import React, { createContext, useContext, useState, useEffect } from 'react';

const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

export const TimerProvider = ({ children }) => {
    const [config, setConfig] = useState({
        prepareTime: 10,
        workTime: 40,
        restTime: 20,
        rounds: 4,
        cycles: 3,
        cycleRestTime: 60
    });

    const [isConfiguring, setIsConfiguring] = useState(true);
    const [activeTimerMode, setActiveTimerMode] = useState(null); // 'circuit', 'emom', 'amrap', 'tabata'
    const [phase, setPhase] = useState('Idle'); // Idle, Prepare, Work, Rest, CycleRest, Done
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [currentCycle, setCurrentCycle] = useState(1);
    const [isActive, setIsActive] = useState(false);

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: Math.max(0, value) }));
    };

    const playBeep = () => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.5);
        } catch (err) {}
    };

    const handleNextPhase = () => {
        if (phase === 'Idle' || phase === 'Done') return;
        
        playBeep();
        
        if (phase === 'Prepare') {
            setPhase('Work');
            setTimeLeft(config.workTime);
        } else if (phase === 'Work') {
            if (currentRound < config.rounds) {
                setPhase('Rest');
                setTimeLeft(config.restTime);
            } else if (currentCycle < config.cycles) {
                setPhase('CycleRest');
                setTimeLeft(config.cycleRestTime);
            } else {
                setPhase('Done');
                setIsActive(false);
            }
        } else if (phase === 'Rest') {
            setCurrentRound(prev => prev + 1);
            setPhase('Work');
            setTimeLeft(config.workTime);
        } else if (phase === 'CycleRest') {
            setCurrentCycle(prev => prev + 1);
            setCurrentRound(1);
            setPhase('Work');
            setTimeLeft(config.workTime);
        }
    };

    const skipPhase = () => {
        if (phase === 'Idle' || phase === 'Done') return;
        handleNextPhase();
    };

    const startTimer = () => {
        setIsConfiguring(false);
        setPhase('Prepare');
        setTimeLeft(config.prepareTime);
        setCurrentRound(1);
        setCurrentCycle(1);
        setIsActive(true);
    };

    const pauseTimer = () => setIsActive(false);
    const resumeTimer = () => setIsActive(true);
    const stopTimer = () => {
        setIsActive(false);
        setPhase('Idle');
        setIsConfiguring(true);
    };

    useEffect(() => {
        let interval;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            handleNextPhase();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, phase, currentRound, currentCycle, config]);

    const value = {
        config, updateConfig, isConfiguring, setIsConfiguring,
        activeTimerMode, setActiveTimerMode,
        phase, setPhase, timeLeft, setTimeLeft, currentRound, setCurrentRound,
        currentCycle, setCurrentCycle, isActive, setIsActive,
        startTimer, pauseTimer, resumeTimer, stopTimer, skipPhase
    };

    return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};
