import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, User, Timer } from 'lucide-react';

export default function BottomNav() {
    const navItems = [
        { path: '/home', icon: Home, label: 'Home' },
        { path: '/exercises', icon: ClipboardList, label: 'Exercises' },
        { path: '/conditioning', icon: Timer, label: 'Timers' },
        { path: '/profile', icon: User, label: 'Profile' }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-[#171717] px-6 pt-4 pb-[calc(env(safe-area-inset-bottom,20px)+12px)] flex justify-around items-center z-50">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-brand-500 scale-110' : 'text-[#A3A3A3] hover:text-white'
                        }`
                    }
                >
                    <item.icon className="w-6 h-6" strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
