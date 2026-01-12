"use client";

import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

interface InteractiveBackgroundProps {
    value: number; // 3 to 10
}

export default function InteractiveBackground({ value }: InteractiveBackgroundProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Calculate size: Base 150px + (Value * 30px). Range: 240px to 450px
    const size = 150 + (value * 30);

    // Position slightly off-center top-right
    const style = {
        width: `${size}px`,
        height: `${size}px`,
        right: '-5%',
        top: '-5%',
    };

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* The Celestial Body */}
            <div
                className={`absolute rounded-full transition-all duration-1000 ease-in-out
                    ${theme === 'dark'
                        ? 'bg-gradient-to-br from-slate-100 to-slate-400 shadow-[0_0_60px_-10px_rgba(255,255,255,0.3)]'
                        : 'bg-gradient-to-br from-yellow-300 to-orange-500 shadow-[0_0_100px_-20px_rgba(255,165,0,0.6)]'
                    }
                `}
                style={style}
            >
                {/* Moon Craters (Only visible in Dark Mode) */}
                <div className={`absolute inset-0 transition-opacity duration-500 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute top-[20%] right-[30%] w-[15%] h-[15%] bg-slate-300/30 rounded-full" />
                    <div className="absolute bottom-[30%] left-[20%] w-[25%] h-[25%] bg-slate-300/20 rounded-full" />
                    <div className="absolute top-[50%] right-[15%] w-[10%] h-[10%] bg-slate-300/25 rounded-full" />
                </div>
            </div>

            {/* Ambient Glow/Rays */}
            <div
                className={`absolute rounded-full filter blur-3xl transition-all duration-1000
                    ${theme === 'dark'
                        ? 'bg-blue-900/20'
                        : 'bg-yellow-400/20'
                    }
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
