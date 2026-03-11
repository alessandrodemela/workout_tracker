import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PrimaryButton({
    children,
    onClick,
    disabled,
    loading,
    variant = 'primary',
    className = ''
}) {
    const baseStyle = "w-full py-4 px-6 rounded-2xl font-bold transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-brand-500 hover:bg-brand-400 text-black shadow-lg shadow-brand-900/20",
        secondary: "bg-[#171717] hover:bg-[#262626] text-[#A3A3A3] border border-[#262626]",
        danger: "bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
        </button>
    );
}
