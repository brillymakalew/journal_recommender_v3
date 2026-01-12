"use client";

import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

interface InteractiveBackgroundProps {
    value: number; // 3 to 10
    loading?: boolean;
}

export default function InteractiveBackground({ value, loading = false }: InteractiveBackgroundProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Calculate size: Base 150px + (Value * 30px). Range: 240px to 450px
    const size = 150 + (value * 30);

    // Position Logic
    // If loading, center it (50% - half size). Else, top-right (-5%).
    const style = loading ? {
        width: `${size}px`,
        height: `${size}px`,
        right: `calc(50% - ${size / 2}px)`,
        top: `calc(50% - ${size / 2}px)`,
    } : {
        width: `${size}px`,
        height: `${size}px`,
        right: '-5%',
        top: '-5%',
    };

    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 h-screen transition-all duration-1000 ${loading ? 'z-50' : 'z-0'}`}>
            {/* Overlay Backdrop when Loading (More Subtle) */}
            <div className={`absolute inset-0 bg-white/30 dark:bg-black/40 transition-opacity duration-500 ${loading ? 'opacity-100 backdrop-blur-[2px]' : 'opacity-0 pointer-events-none'}`} />

            {/* The Celestial Body */}
            <div
                className={`absolute transition-all duration-1000 ease-in-out flex items-center justify-center
                    ${theme === 'dark'
                        ? 'bg-gradient-to-br from-slate-100 to-slate-400 shadow-[0_0_60px_-10px_rgba(255,255,255,0.3)]'
                        : 'bg-gradient-to-br from-yellow-300 to-orange-500 shadow-[0_0_100px_-20px_rgba(255,165,0,0.6)]'
                    }
                    ${loading ? 'animate-fluid select-none' : 'rounded-full'}
                `}
                style={style}
            >
                {/* Custom Fluid Animation */}
                <style jsx>{`
                    @keyframes fluid {
                        0% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; transform: scale(1); }
                        33% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: scale(1.05); }
                        66% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: scale(0.95); }
                        100% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; transform: scale(1); }
                    }
                    .animate-fluid {
                        animation: fluid 6s ease-in-out infinite;
                    }
                `}</style>

                {/* Moon Craters (Only visible in Dark Mode) */}
                <div className={`absolute inset-0 transition-opacity duration-500 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute top-[20%] right-[30%] w-[15%] h-[15%] bg-slate-300/30 rounded-full" />
                    <div className="absolute bottom-[30%] left-[20%] w-[25%] h-[25%] bg-slate-300/20 rounded-full" />
                    <div className="absolute top-[50%] right-[15%] w-[10%] h-[10%] bg-slate-300/25 rounded-full" />

                </div>

                {/* Loading Text */}
                {loading && (
                    <div className="text-center z-10 animate-in fade-in zoom-in duration-500">
                        <p className={`font-black text-2xl mb-2 ${theme === 'dark' ? 'text-slate-800' : 'text-white drop-shadow-md'}`}>
                            Analyzing...
                        </p>
                        <p className={`font-medium text-sm ${theme === 'dark' ? 'text-slate-600' : 'text-white/90 drop-shadow-sm'}`}>
                            Please wait while we scan millions of journals.
                        </p>
                    </div>
                )}
            </div>

            {/* Ambient Glow/Rays */}
            <div
                className={`absolute rounded-full filter blur-3xl transition-all duration-1000
                    ${theme === 'dark'
                        ? 'bg-blue-900/20'
                        : 'bg-yellow-400/20'
                    }
                    ${loading ? 'opacity-0' : 'opacity-100'}
                `}
                style={{
                    width: `${size * 1.5}px`,
                    height: `${size * 1.5}px`,
                    right: '-10%',
                    top: '-10%',
                    zIndex: -1
                }}
            />
        </div>
    );
}
