import React, { useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import {
    User,
    Camera,
    Edit2,
    Save,
    X,
    Check,
    History as HistoryIcon,
    TrendingUp,
    Dumbbell,
    Clock,
    ChevronRight,
    Trophy,
    Target,
    LogOut,
    Settings,
    Info,
    Github,
    Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { API_URL, fetcher } from '../api';
import History from './History';
import pkg from '../../package.json';
import AppInfoModal from '../components/AppInfoModal';

export default function Profile() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { data: history, error } = useSWR(`${API_URL}/workout-history`, fetcher);

    const [isEditing, setIsEditing] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [nickname, setNickname] = useState(user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'Athlete');
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    const stats = useMemo(() => {
        if (!history?.workouts) return { totalWorkouts: 0, totalVolume: 0, avgTime: 0 };

        const sessions = new Set();
        let totalVolume = 0;
        let totalSets = 0;

        history.workouts.forEach(log => {
            sessions.add(`${log.Date}_${log.Session_Type}`);
            totalSets += parseInt(log.Sets) || 0;

            const weightMatch = log.notes?.match(/\[\[W:([\d.,]+)\]\]/);
            const repsArr = (log.Reps || '').toString().split(',').map(r => parseInt(r.trim()) || 0);

            let exerciseVolume = 0;
            if (weightMatch) {
                const weights = weightMatch[1].split(',').map(w => parseFloat(w.trim()) || 0);
                repsArr.forEach((reps, i) => {
                    const weight = weights[i] !== undefined ? weights[i] : (weights[weights.length - 1] || 0);
                    exerciseVolume += reps * weight;
                });
            } else {
                const kg = parseFloat(log.Kg) || 0;
                exerciseVolume = repsArr.reduce((acc, reps) => acc + (reps * kg), 0);
            }
            totalVolume += exerciseVolume;
        });

        return {
            totalWorkouts: sessions.size,
            totalVolume: (totalVolume / 1000).toFixed(1),
            avgTime: sessions.size > 0 ? Math.round((totalSets * 3.5) / sessions.size) : 0
        };
    }, [history]);

    const handleUpdateProfile = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { nickname, avatar_url: avatarUrl }
            });
            if (error) throw error;
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarClick = () => {
        if (isEditing) {
            const url = prompt("Enter image URL (temporary solution):", avatarUrl);
            if (url !== null) setAvatarUrl(url);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32 pt-4 animate-fade-in w-full">
            {/* Profile Header Card */}
            <div className="relative overflow-hidden card-glass p-6 md:p-8 rounded-[3rem] border-[#171717]">
                <div className="absolute top-0 right-0 p-4 md:p-6 flex flex-col gap-2 scale-90 origin-top-right">
                    <button
                        onClick={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
                        disabled={isSaving}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isEditing ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20' : 'bg-[#171717] text-[#A3A3A3] hover:text-white'
                            }`}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : isEditing ? (
                            <Check className="w-6 h-6" />
                        ) : (
                            <Edit2 className="w-5 h-5" />
                        )}
                    </button>
                    {!isEditing && (
                        <>
                            <button
                                onClick={() => navigate('/settings')}
                                className="w-12 h-12 rounded-2xl bg-[#171717] text-[#404040] flex items-center justify-center hover:text-brand-500 transition-all"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowInfoModal(true)}
                                className="w-12 h-12 rounded-2xl bg-[#171717] text-[#404040] flex items-center justify-center hover:text-brand-500 transition-all"
                            >
                                <Target className="w-5 h-5" />
                            </button>
                        </>
                    )}
                    {isEditing && (
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setNickname(user?.user_metadata?.nickname || user?.email?.split('@')[0]);
                                setAvatarUrl(user?.user_metadata?.avatar_url || '');
                            }}
                            className="w-12 h-12 rounded-2xl bg-[#171717] text-red-500 flex items-center justify-center hover:bg-black/40 transition-all font-bold"
                        >
                            <X className="w-5 h-5" strokeWidth={3} />
                        </button>
                    )}
                </div>

                <div className="flex flex-col items-center gap-6">
                    {/* Avatar */}
                    <div className="relative group">
                        <div
                            onClick={handleAvatarClick}
                            className={`w-28 h-28 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 p-1 shadow-2xl transition-transform ${isEditing ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
                        >
                            <div className="w-full h-full rounded-[2.2rem] bg-[#0A0A0A] overflow-hidden flex items-center justify-center relative">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-brand-500 uppercase">{nickname.charAt(0)}</span>
                                )}
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl bg-black border border-[#171717] flex items-center justify-center text-brand-500 shadow-xl">
                            <Trophy className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Name & Email */}
                    <div className="flex flex-col items-center gap-1 w-full">
                        {isEditing ? (
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="w-full bg-black/40 border border-[#262626] rounded-2xl px-4 py-3 text-2xl font-black text-center text-white focus:outline-none focus:border-brand-500 transition-colors"
                                placeholder="Nickname"
                                autoFocus
                            />
                        ) : (
                            <h2 className="text-4xl font-black text-white tracking-tight text-center truncate w-full">{nickname}</h2>
                        )}
                        <span className="text-xs font-bold text-[#404040] uppercase tracking-widest leading-loose">{user?.email}</span>
                    </div>
                </div>

                {/* Stats Mini Grid */}
                <div className="grid grid-cols-3 gap-3 mt-10">
                    {[
                        { label: 'Workouts', value: stats.totalWorkouts, icon: Dumbbell },
                        { label: 'Volume (t)', value: stats.totalVolume, icon: TrendingUp },
                        { label: 'Avg Min', value: stats.avgTime, icon: Clock },
                    ].map((s, idx) => (
                        <div key={idx} className="bg-white/5 backdrop-blur-md rounded-3xl p-4 flex flex-col items-center gap-1 border border-white/5">
                            <s.icon className="w-4 h-4 text-brand-500 opacity-60" />
                            <span className="text-lg font-black text-white leading-none">{s.value}</span>
                            <span className="text-[8px] font-black text-[#A3A3A3] uppercase tracking-tight">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* History Section */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-2xl bg-[#171717] flex items-center justify-center text-brand-500">
                        <HistoryIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight">Recent Activity</h3>
                </div>

                <div className="flex flex-col gap-4">
                    {history?.workouts ? (
                        <History isEmbedded={true} />
                    ) : (
                        <div className="p-12 text-center text-[#404040] font-bold uppercase tracking-widest text-xs border-2 border-dashed border-[#171717] rounded-[2.5rem]">
                            Loading Activity...
                        </div>
                    )}
                </div>
            </div>

            {/* Account Management */}
            <div className="mt-4 flex flex-col pt-4 border-t border-[#171717]">
                <button
                    onClick={() => signOut()}
                    className="w-full h-24 flex items-center justify-between bg-[#0A0A0A] border border-[#171717] p-6 rounded-[2rem] group hover:border-red-500/10 transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-black transition-all">
                            <LogOut className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-lg font-black text-white tracking-tight">Logout</span>
                            <span className="text-[10px] font-bold text-[#404040] uppercase tracking-widest mt-1">End your session</span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#262626] group-hover:text-red-500 transition-colors" />
                </button>
            </div>

            <AppInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
        </div>
    );
}
