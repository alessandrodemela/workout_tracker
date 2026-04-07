import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Settings, Info, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppInfoModal from './AppInfoModal';

export default function UserMenu() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [showAppInfo, setShowAppInfo] = useState(false);

    const menuItems = [
        { icon: <Settings className="w-4 h-4" />, label: 'Settings', onClick: () => navigate('/settings') },
        { icon: <Info className="w-4 h-4" />, label: 'App Info', onClick: () => setShowAppInfo(true) },
    ];

    return (
        <div className="absolute top-6 right-6 pointer-events-auto" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 rounded-2xl bg-[#0A0A0A] border border-[#171717] flex items-center justify-center text-white shadow-xl hover:border-brand-500/50 transition-all active:scale-95"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-16 right-0 w-64 bg-[#0A0A0A] border border-[#171717] rounded-3xl shadow-2xl overflow-hidden p-2"
                    >
                        {/* User Profile Header */}
                        <div className="p-4 flex items-center gap-3 border-b border-[#171717] mb-2">
                            <div className="w-10 h-10 rounded-full bg-brand-500 text-black flex items-center justify-center font-black">
                                <span className="uppercase">{user?.email?.charAt(0) || 'A'}</span>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-black text-brand-500 uppercase tracking-widest truncate">
                                    {user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'Atleta'}
                                </span>
                                <span className="text-[10px] font-bold text-[#404040] truncate">
                                    {user?.email}
                                </span>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="flex flex-col gap-1">
                            {menuItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        item.onClick();
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#A3A3A3] hover:text-white hover:bg-white/5 transition-all text-sm font-bold group"
                                >
                                    <div className="text-[#404040] group-hover:text-brand-500 transition-colors">
                                        {item.icon}
                                    </div>
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Logout Section */}
                        <div className="mt-2 pt-2 border-t border-[#171717]">
                            <button
                                onClick={() => signOut()}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold group"
                            >
                                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Logout
                            </button>
                        </div>

                        {/* Footer Info */}
                        <div className="p-4 bg-black/40 rounded-2xl mt-1 text-center">
                            <span className="text-[9px] font-black text-[#262626] uppercase tracking-[0.3em]">
                                Strive v1.0.0
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AppInfoModal isOpen={showAppInfo} onClose={() => setShowAppInfo(false)} />
        </div>
    );
}
