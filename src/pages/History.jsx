import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ChevronDown, Clock, Dumbbell, TrendingUp, Calendar, Search } from 'lucide-react';
import { API_URL, fetcher } from '../api';

export default function History() {
    const { data: history, error } = useSWR(`${API_URL}/workout-history`, fetcher);
    const [timeFilter, setTimeFilter] = useState('All Time');
    const [expandedSession, setExpandedSession] = useState(null);

    const MUSCLE_GROUP_COLORS = {
        'Chest': '#FF6B6B',
        'Back': '#4ECDC4',
        'Legs': '#FFE66D',
        'Shoulders': '#A8E6CF',
        'Arms': '#FF8B94',
        'Core': '#B8B8FF',
    };

    const groupedSessions = useMemo(() => {
        if (!history?.workouts) return [];
        const groups = {};

        history.workouts.forEach(log => {
            const key = `${log.Date}_${log.Session_Type}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    date: log.Date,
                    sessionType: log.Session_Type,
                    exercises: [],
                    totalSets: 0,
                    totalVolume: 0,
                    timeFallback: 0,
                    muscleGroups: new Set()
                };
            }

            groups[key].exercises.push(log);
            groups[key].totalSets += parseInt(log.Sets) || 0;
            if (log.Target_Muscle) groups[key].muscleGroups.add(log.Target_Muscle);

            const repsStr = (log.Reps || '0').toString();
            const repsArr = repsStr.split(',').map(r => parseInt(r.trim()) || 0);
            const totalReps = repsArr.reduce((a, b) => a + b, 0);
            const kg = parseFloat(log.Kg) || 0;
            groups[key].totalVolume += (totalReps * kg) / 1000;
        });

        return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => {
            s.timeFallback = Math.round(s.totalSets * 3.5);
            s.muscleGroupList = Array.from(s.muscleGroups);
            return s;
        });
    }, [history]);

    const filteredSessions = useMemo(() => {
        if (timeFilter === 'All Time') return groupedSessions;
        const now = new Date();
        return groupedSessions.filter(s => {
            const d = new Date(s.date);
            const diffDays = (now - d) / (1000 * 60 * 60 * 24);
            if (timeFilter === 'This Week') return diffDays <= 7;
            if (timeFilter === 'This Month') return diffDays <= 30;
            return true;
        });
    }, [groupedSessions, timeFilter]);

    const weeklyStats = useMemo(() => {
        const now = new Date();
        const stats = [];

        for (let i = 3; i >= 0; i--) {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay() - i * 7);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);

            const workoutsInWeek = groupedSessions.filter(s => {
                const d = new Date(s.date);
                return d >= start && d < end;
            });

            stats.push({
                label: i === 0 ? 'This' : i === 1 ? 'Last' : `${i + 1}w`,
                volume: workoutsInWeek.reduce((acc, curr) => acc + curr.totalVolume, 0),
                sessions: workoutsInWeek.length
            });
        }

        const maxVol = Math.max(...stats.map(s => s.volume), 1);
        return stats.map(s => ({ ...s, height: Math.max((s.volume / maxVol) * 100, 10) }));
    }, [groupedSessions]);

    const stats = useMemo(() => {
        const totalWorkouts = filteredSessions.length;
        const totalVolume = filteredSessions.reduce((acc, curr) => acc + curr.totalVolume, 0);
        const avgTime = totalWorkouts > 0
            ? Math.round(filteredSessions.reduce((acc, curr) => acc + curr.timeFallback, 0) / totalWorkouts)
            : 0;
        return { totalWorkouts, totalVolume: totalVolume.toFixed(1), avgTime };
    }, [filteredSessions]);

    const getRelativeDate = (dateStr) => {
        if (!dateStr) return 'UNKNOWN';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr.toUpperCase();
        d.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'TODAY';
        if (diff === 1) return 'YESTERDAY';
        if (diff < 7 && diff > 0) return `${diff} DAYS AGO`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (error) return (
        <div className="p-6 text-brand-500 font-bold text-center">
            <p>Connection error.</p>
            <p className="text-[10px] opacity-50 mt-2 font-mono uppercase">{error?.message || JSON.stringify(error)}</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 pb-32 animate-fade-in pt-6 px-6">
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">History</h1>

            <div className="grid grid-cols-3 gap-3">
                <div className="card-glass p-4 rounded-3xl flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Workouts</span>
                    <span className="text-2xl font-black text-white">{stats.totalWorkouts}</span>
                </div>
                <div className="card-glass p-4 rounded-3xl flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Volume</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-black text-white">{stats.totalVolume}</span>
                        <span className="text-xs font-bold text-[#A3A3A3]">t</span>
                    </div>
                </div>
                <div className="card-glass p-4 rounded-3xl flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Avg Time</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-black text-white">{stats.avgTime}</span>
                        <span className="text-xs font-bold text-[#A3A3A3]">m</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center bg-[#0A0A0A] border border-[#171717] rounded-full p-1">
                {['All Time', 'This Week', 'This Month'].map(f => (
                    <button
                        key={f}
                        onClick={() => setTimeFilter(f)}
                        className={`flex-1 py-3 text-xs font-bold rounded-full transition-all ${timeFilter === f ? 'bg-[#D4FF00] text-black shadow-md' : 'text-[#A3A3A3] hover:text-white'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="card-glass p-5 rounded-3xl flex flex-col gap-4 border-[#171717]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">Weekly Volume</h3>
                <div className="flex items-end justify-between h-24 gap-4 mt-2 px-2">
                    {weeklyStats.map((w, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1 gap-2">
                            <div
                                className={`w-full rounded-xl transition-all duration-500 ${idx === 3 ? 'bg-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.3)]' : idx === 2 ? 'bg-[#262626]' : 'bg-[#171717]'}`}
                                style={{ height: `${w.height}%` }}
                            ></div>
                            <span className={`text-[9px] font-black ${idx === 3 ? 'text-[#D4FF00]' : 'text-white'}`}>{w.sessions}×</span>
                            <span className="text-[9px] font-bold text-[#A3A3A3]">{w.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {filteredSessions.map((session, i) => (
                    <div key={i} className={`card-glass p-6 rounded-[2.5rem] flex flex-col border-[#171717] hover:border-[#262626] transition-all relative overflow-hidden group ${expandedSession === session.key ? 'bg-black/40 ring-1 ring-white/5 shadow-2xl' : ''}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">{getRelativeDate(session.date)}</span>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none">{session.sessionType || 'Workout'}</h2>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button
                                    onClick={() => setExpandedSession(expandedSession === session.key ? null : session.key)}
                                    className={`w-10 h-10 rounded-2xl bg-[#171717] flex items-center justify-center text-[#A3A3A3] transition-all ${expandedSession === session.key ? 'rotate-180 bg-[#D4FF00] text-black shadow-lg shadow-brand-500/20' : 'group-hover:text-white group-hover:bg-[#262626]'}`}
                                >
                                    <ChevronDown className="w-5 h-5" />
                                </button>
                                <div className="flex gap-1 justify-end">
                                    {session.muscleGroupList.map(muscle => (
                                        <div key={muscle} className="w-2 h-2 rounded-full" style={{ background: MUSCLE_GROUP_COLORS[muscle] || '#A3A3A3' }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 text-[#A3A3A3] text-[13px] font-bold tracking-tight mt-5">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 opacity-70" />
                                <span>{formatTime(session.timeFallback)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Dumbbell className="w-4 h-4 opacity-70" />
                                <span>{session.totalSets} sets</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 opacity-70" />
                                <span>{session.totalVolume.toFixed(1)}t</span>
                            </div>
                        </div>

                        {expandedSession === session.key && (
                            <div className="mt-8 flex flex-col gap-8 border-t border-[#171717] pt-8 animate-slide-down">
                                {session.exercises.map((ex, idx) => (
                                    <div key={idx} className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(212,255,0,0.5)]" style={{ background: MUSCLE_GROUP_COLORS[ex.Target_Muscle] || '#D4FF00' }}></div>
                                            <span className="text-lg font-black text-white tracking-tight">{ex.Exercise}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2.5">
                                            {(ex.Reps || '').toString().split(',').filter(r => r.trim() !== '').map((rep, rIdx) => (
                                                <div key={rIdx} className="bg-[#171717] border border-[#262626] py-2 px-4 rounded-xl flex items-center gap-1.5 min-w-[80px] justify-center">
                                                    <span className="text-[10px] font-bold text-[#A3A3A3]">{rIdx + 1} ·</span>
                                                    <span className="text-sm font-black text-white">{ex.Kg || 0}</span>
                                                    <span className="text-[10px] font-bold text-[#A3A3A3]">kg</span>
                                                    <span className="text-[10px] font-black text-[#A3A3A3]">×</span>
                                                    <span className="text-sm font-black text-white">{rep.trim()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {filteredSessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <Calendar className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No Activity</h3>
                        <p className="text-[#A3A3A3] text-sm">You haven't logged any sessions in this period.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
