import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { checkHealth } from '../api';

export default function LandingScreen() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Starting App...');

    useEffect(() => {
        let mounted = true;
        const prepareApp = async () => {
            // Give a short branding moment, then go!
            // No need to wait for a backend boot that doesn't exist anymore.
            setTimeout(() => {
                if (mounted) navigate('/home');
            }, 1000);
        };
        prepareApp();
        return () => { mounted = false; };
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 animate-fade-in px-6 text-center bg-[#000000]">
            <h1 className="text-5xl font-black tracking-tighter text-white">
                GymTracker
                <span className="text-brand-500">.</span>
            </h1>

            <div className="flex flex-col items-center gap-3 mt-8">
                {status !== 'Connected!' ? (
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center">
                        <span className="text-xl font-bold">✓</span>
                    </div>
                )}
                <p className="text-[#A3A3A3] text-sm font-medium tracking-wide uppercase mt-2">
                    {status}
                </p>
            </div>
        </div>
    );
}
