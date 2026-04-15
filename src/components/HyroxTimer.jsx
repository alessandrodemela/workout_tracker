import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, Flag, Zap, Clock, SkipForward, CheckCircle, RefreshCcw, Dumbbell, Activity, Timer } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { saveFunctionalSession } from '../api';
import { useAuth } from '../context/AuthContext';

const CONFIG_OPTIONS = {
    run: ['500m', '1000m'],
    skiErg: ['500m', '750m', '1000m'],
    sledPush: ['25m', '50m'],
    sledPull: ['25m', '50m'],
    bbj: ['40m', '60m', '80m'],
    rowing: ['500m', '750m', '1000m'],
    farmerCarry: ['100m', '150m', '200m'],
    sandbagLunges: ['50m', '75m', '100m'],
    wallBall: ['50', '75', '100']
}

// Friendly titles for the config UI
const EXERCISE_TITLES = {
    run: 'Runs (All)',
    skiErg: 'Ski Erg',
    sledPush: 'Sled Push',
    sledPull: 'Sled Pull',
    bbj: 'BB Broad Jumps',
    rowing: 'Rowing',
    farmerCarry: 'Farmers Carry',
    sandbagLunges: 'Sandbag Lunges',
    wallBall: 'Wall Balls'
}

const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
};

function ConfigSelector({ title, options, value, onChange }) {
    return (
        <div className="flex flex-col gap-2 bg-[#171717]/30 p-4 rounded-2xl border border-[#262626]">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{title}</span>
            <div className="flex gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border ${value === opt ? 'bg-brand-500 text-black border-brand-500 shadow-[0_0_10px_rgba(212,255,0,0.2)]' : 'bg-[#0A0A0A] text-[#A3A3A3] border-[#262626] hover:text-white hover:border-[#404040]'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function HyroxTimer({ onClose }) {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [view, setView] = useState('setup'); // 'setup', 'active', 'summary'
    const [config, setConfig] = useState({
        run: '1000m',
        skiErg: '1000m',
        sledPush: '50m',
        sledPull: '50m',
        bbj: '80m',
        rowing: '1000m',
        farmerCarry: '200m',
        sandbagLunges: '100m',
        wallBall: '100'
    });

    const applyPreset = (type) => {
        if (type === 'full') {
            setConfig({
                run: '1000m', skiErg: '1000m', sledPush: '50m', sledPull: '50m',
                bbj: '80m', rowing: '1000m', farmerCarry: '200m', sandbagLunges: '100m', wallBall: '100'
            });
        } else {
            setConfig({
                run: '500m', skiErg: '500m', sledPush: '25m', sledPull: '25m',
                bbj: '40m', rowing: '500m', farmerCarry: '100m', sandbagLunges: '50m', wallBall: '50'
            });
        }
    };
    
    const [splits, setSplits] = useState([]);
    
    // Timer states
    const [isActive, setIsActive] = useState(false);
    const [globalTimeLeft, setGlobalTimeLeft] = useState(0); // Actually counting UP
    const [splitStartTime, setSplitStartTime] = useState(0);
    const [currentSplitIndex, setCurrentSplitIndex] = useState(0);
    const [splitRecords, setSplitRecords] = useState([]); // Array of { splitId, duration }
    const [showStopModal, setShowStopModal] = useState(false);

    // Audio context for finish beep
    const audioContextRef = useRef(null);

    const playBeep = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const context = audioContextRef.current;
            if (context.state === 'suspended') context.resume();

            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.3);
        } catch (err) { }
    };

    const buildWorkoutSplits = (cfg) => {
        const sequence = [
            { key: 'run', title: 'Run' },
            { key: 'skiErg', title: 'SkiErg' },
            { key: 'run', title: 'Run' },
            { key: 'sledPush', title: 'Sled Push' },
            { key: 'run', title: 'Run' },
            { key: 'sledPull', title: 'Sled Pull' },
            { key: 'run', title: 'Run' },
            { key: 'bbj', title: 'Burpee Broad Jumps' },
            { key: 'run', title: 'Run' },
            { key: 'rowing', title: 'Rowing' },
            { key: 'run', title: 'Run' },
            { key: 'farmerCarry', title: 'Farmers Carry' },
            { key: 'run', title: 'Run' },
            { key: 'sandbagLunges', title: 'Sandbag Lunges' },
            { key: 'run', title: 'Run' },
            { key: 'wallBall', title: 'Wall Balls' }
        ];

        return sequence.map((step, idx) => ({
            id: idx + 1,
            title: step.title,
            distance: cfg[step.key]
        }));
    };

    const startWorkout = () => {
        const generatedSplits = buildWorkoutSplits(config);
        setSplits(generatedSplits);
        setGlobalTimeLeft(0);
        setSplitStartTime(0);
        setCurrentSplitIndex(0);
        setSplitRecords([]);
        setView('active');
        setIsActive(true);
        playBeep(); // Unlock audio
    };

    useEffect(() => {
        let interval;
        if (isActive) {
            interval = setInterval(() => {
                setGlobalTimeLeft(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    const nextSplit = () => {
        const currentSplitDuration = globalTimeLeft - splitStartTime;

        const newRecord = {
            ...splits[currentSplitIndex],
            duration: currentSplitDuration
        };

        setSplitRecords(prev => [...prev, newRecord]);
        setSplitStartTime(globalTimeLeft);
        playBeep();

        if (currentSplitIndex < splits.length - 1) {
            setCurrentSplitIndex(prev => prev + 1);
        } else {
            // Finished
            setIsActive(false);
            setView('summary');
        }
    };

    const togglePause = () => {
        setIsActive(!isActive);
    };

    const updateConfig = (key, val) => {
        setConfig(prev => ({ ...prev, [key]: val }));
    };

    const handleSaveRace = async () => {
        if (!user) return;
        setIsSaving(true);
        const totalDuration = splitRecords.reduce((acc, split) => acc + split.duration, 0);
        const dateStr = new Date().toISOString().split('T')[0];
        
        try {
            await saveFunctionalSession({
                Date: dateStr,
                Session_Type: 'Hyrox',
                Exercise: 'Hyrox Race',
                Notes: config.run === '500m' ? 'Half Hyrox' : 'Full Hyrox',
                Duration_Seconds: totalDuration,
                Splits: splitRecords
            }, user.id);
            onClose();
        } catch (error) {
            console.error("Failed to save Hyrox session:", error);
            alert("Failed to save session.");
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Setup View ─────────────────────────────────────────────────────────────
    if (view === 'setup') {
        return (
            <div className="h-full flex flex-col animate-fade-in w-full">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tight text-white">HYROX</h1>
                        <p className="text-[#A3A3A3] text-sm pl-0.5">Customize your race</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-8 flex-1 overflow-y-auto pr-1 pb-4">
                    <div className="flex gap-3 mb-2">
                        <button
                            onClick={() => applyPreset('half')}
                            className="flex-1 py-4 bg-[#171717] border border-brand-500/30 hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center gap-1 group transition-all active:scale-95"
                        >
                            <Zap className="w-5 h-5 text-brand-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Half Preset</span>
                        </button>
                        <button
                            onClick={() => applyPreset('full')}
                            className="flex-1 py-4 bg-[#171717] border border-brand-500/30 hover:border-brand-500 rounded-2xl flex flex-col items-center justify-center gap-1 group transition-all active:scale-95"
                        >
                            <Flag className="w-5 h-5 text-brand-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Full Preset</span>
                        </button>
                    </div>

                    <ConfigSelector 
                        title="Runs (All Splits)" 
                        options={CONFIG_OPTIONS.run} 
                        value={config.run} 
                        onChange={(v) => updateConfig('run', v)} 
                    />
                    
                    <div className="grid grid-cols-1 gap-3">
                        {Object.keys(CONFIG_OPTIONS).filter(k => k !== 'run').map(key => (
                            <ConfigSelector 
                                key={key}
                                title={EXERCISE_TITLES[key]} 
                                options={CONFIG_OPTIONS[key]} 
                                value={config[key]} 
                                onChange={(v) => updateConfig(key, v)} 
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-shrink-0 py-4 border-t border-[#262626]">
                    <button
                        onClick={startWorkout}
                        className="w-full py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform"
                    >
                        <Play className="w-6 h-6 fill-black" />
                        Start configured Race
                    </button>
                </div>
            </div>
        );
    }

    // ─── Active View ────────────────────────────────────────────────────────────
    if (view === 'active') {
        const currentSplit = splits[currentSplitIndex];
        const nextSplitData = splits[currentSplitIndex + 1];
        const currentSplitTime = globalTimeLeft - splitStartTime;

        return (
            <div className="h-full flex flex-col animate-fade-in w-full">
                <div className="flex justify-between items-center flex-shrink-0">
                    <button
                        onClick={() => setShowStopModal(true)}
                        className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Split {currentSplitIndex + 1} / {splits.length}</span>
                        <span className="text-xl font-black text-white">HYROX RACE</span>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center flex-1 py-8">
                    {/* Global Timer */}
                    <span className="text-sm font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Total Time</span>
                    <span className="text-[70px] leading-none font-black tabular-nums tracking-tighter text-white mb-8">
                        {formatTime(globalTimeLeft)}
                    </span>

                    {/* Current Split Card */}
                    <div className="w-full bg-[#171717] border border-brand-500/50 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(212,255,0,0.05)]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">Current Split</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Split Time</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-3xl font-black text-white tracking-tight">{currentSplit.title}</span>
                                <span className="text-lg font-bold text-[#A3A3A3] mt-1">{currentSplit.distance}{currentSplit.title === 'Wall Balls' ? '' : ''}</span>
                            </div>
                            <span className="text-4xl font-black tabular-nums text-white pb-1">
                                {formatTime(currentSplitTime)}
                            </span>
                        </div>
                    </div>

                    {/* Next Split Preview */}
                    {nextSplitData && (
                        <div className="w-full mt-4 flex items-center justify-between px-6 py-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl opacity-70">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Next</span>
                                <span className="text-sm font-bold text-white">{nextSplitData.title}</span>
                            </div>
                            <span className="text-xs font-bold text-[#A3A3A3]">{nextSplitData.distance}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-4 flex-shrink-0 pb-[80px]">
                    <button
                        onClick={togglePause}
                        className="w-16 h-16 rounded-[1.5rem] bg-[#171717] flex items-center justify-center text-white border border-[#262626] hover:border-[#404040] active:scale-95 transition-all"
                    >
                        {isActive ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white translate-x-0.5" />}
                    </button>

                    <button
                        onClick={nextSplit}
                        disabled={!isActive}
                        className={`flex-1 h-20 rounded-[2rem] font-black uppercase tracking-widest text-lg flex items-center justify-center gap-2 transition-transform shadow-lg ${isActive ? 'bg-brand-500 text-black shadow-brand-500/20 active:scale-95 cursor-pointer' : 'bg-[#262626] text-[#A3A3A3] cursor-not-allowed opacity-50'}`}
                    >
                        {currentSplitIndex === splits.length - 1 ? 'Finish Race' : 'Next Split'}
                        <SkipForward className="w-6 h-6" />
                    </button>
                </div>

                <ConfirmModal
                    isOpen={showStopModal}
                    onClose={() => setShowStopModal(false)}
                    onConfirm={() => { setShowStopModal(false); onClose(); }}
                    title="End Race?"
                    message="Are you sure you want to quit? Your progress will be lost."
                    confirmText="Quit Race"
                    cancelText="Keep Going"
                    type="danger"
                />
            </div>
        );
    }

    // ─── Summary View ───────────────────────────────────────────────────────────
    if (view === 'summary') {
        const totalDuration = splitRecords.reduce((acc, split) => acc + split.duration, 0);

        return (
            <div className="h-full flex flex-col animate-fade-in w-full">
                <div className="flex flex-col items-center justify-center flex-shrink-0 pt-10 pb-6 border-b border-[#262626]">
                    <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
                        <Flag className="w-10 h-10 text-brand-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">HYROX COMPLETED</span>
                    <span className="text-5xl font-black tabular-nums tracking-tighter text-white">
                        {formatTime(totalDuration)}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                    <h3 className="text-lg font-black tracking-tight text-white mb-4">Split Times</h3>
                    <div className="flex flex-col gap-2">
                        {splitRecords.map((split, i) => (
                            <div key={i} className="bg-[#171717] border border-[#262626] p-4 rounded-2xl flex justify-between items-center group hover:border-[#404040] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#0A0A0A] border border-[#262626] flex items-center justify-center text-[10px] font-black text-[#A3A3A3]">
                                        {i + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white">{split.title}</span>
                                        <span className="text-[10px] font-bold text-[#A3A3A3] uppercase">{split.distance}</span>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-brand-500 tabular-nums">
                                    {formatTime(split.duration)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-shrink-0 py-4 border-t border-[#262626] flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-5 rounded-[2rem] bg-[#171717] border border-[#262626] text-[#A3A3A3] font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 hover:text-white transition-all cursor-pointer"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSaveRace}
                        disabled={isSaving}
                        className="flex-[2] py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Save Race'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
