import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Heart } from 'lucide-react';
import useSWR from 'swr';
import { API_URL, fetcher } from '../api';
import pkg from '../../package.json';

export default function AppInfoModal({ isOpen, onClose }) {
    const { error } = useSWR(`${API_URL}/workout-history`, fetcher);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-[#000000]/80 backdrop-blur-xl z-[90] flex items-center justify-center p-6"
                >
                    <motion.div
                        initial={{ scale: 0.92, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.92, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm card-glass !bg-[#050505] p-8 flex flex-col items-center gap-8 border-white/5 shadow-[0_0_80px_rgba(212,255,0,0.05)] border-[#1a1a1a]"
                    >
                        {/* Logo & Version */}
                        <div className="flex flex-col items-center gap-5">
                            <div className="w-24 h-24 rounded-[2.2rem] bg-gradient-to-br from-brand-500 to-brand-700 p-1 shadow-2xl relative">
                                <div className="w-full h-full rounded-[2rem] bg-[#0A0A0A] overflow-hidden p-4 flex items-center justify-center">
                                    <img src="/icon.png" alt="Strive" className="w-full h-full object-contain mix-blend-screen" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-brand-500 text-black flex items-center justify-center shadow-lg">
                                    <Trophy className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <h2 className="text-4xl font-black text-white tracking-tighter">STRIVE</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em]">v{pkg.version}</span>
                                    <div className="w-1 h-1 rounded-full bg-[#171717]"></div>
                                    <span className="text-[9px] font-black text-[#808080] uppercase">April 2026</span>
                                </div>
                            </div>
                        </div>

                        {/* Tech Badges */}
                        <div className="w-full flex flex-col gap-2">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[9px] font-bold text-[#404040] uppercase tracking-widest">Platform Status</span>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine && !error ? 'bg-brand-500 animate-pulse-dot shadow-[0_0_8px_#D4FF00]' : 'bg-red-500'}`}></div>
                                    <span className={`text-[9px] font-black uppercase ${navigator.onLine && !error ? 'text-brand-500' : 'text-red-500'}`}>
                                        {navigator.onLine && !error ? 'Operational' : 'Degraded'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-5 bg-brand-500 text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-[0_10px_20px_rgba(212,255,0,0.15)] hover:bg-brand-400"
                        >
                            Dismiss
                        </button>

                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-2">
                                <Heart className="w-3 h-3 text-red-500" />
                                <span className="text-[8px] font-black text-[#A3A3A3] uppercase tracking-[0.2em]">Crafted for the elite</span>
                            </div>
                            <span className="text-[8px] font-black text-[#404040] uppercase tracking-[0.5em]">© STRIVE {new Date().getFullYear()}</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
