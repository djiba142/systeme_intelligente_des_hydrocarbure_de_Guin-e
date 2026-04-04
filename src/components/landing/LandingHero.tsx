import { useState, useEffect, useMemo } from "react";
import heroImage from '@/assets/hero.jpg';
import { Link } from 'react-router-dom';
import { ChevronRight, Play } from 'lucide-react';

export const LandingHero = () => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setScrollY(window.scrollY);
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const transformStyle = useMemo(() => ({
        transform: `translateY(${-scrollY * 0.1}px)`,
        opacity: Math.max(0, 1 - scrollY / 700)
    }), [scrollY]);

    return (
        <section className="relative w-full h-screen overflow-hidden bg-slate-900">
            {/* Background Image Holder */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-slate-900/60 z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-900 z-10" />

                <img
                    src={heroImage}
                    alt="Hero Background"
                    className="w-full h-full object-cover scale-105"
                    style={{ filter: 'brightness(0.6) contrast(1.1)' }}
                    loading="eager"
                />
            </div>

            {/* Content Container */}
            <div className="relative h-full z-20 flex flex-col items-center justify-center text-center px-4">
                <div
                    className="max-w-5xl space-y-10 transition-all duration-700 ease-out"
                    style={transformStyle}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                        Intelligence Pétrolière
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
                        Un secteur <span className="text-[#f97316]">numérique</span>,
                        <br />transparent et sécurisé.
                    </h1>

                    <p className="text-sm md:text-base text-white/70 max-w-xl mx-auto font-medium">
                        Système intégré de surveillance en temps réel pour une gestion transparente des hydrocarbures en Guinée.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link
                            to="/auth"
                            className="w-full sm:w-auto px-8 py-4 bg-[#f97316] hover:bg-orange-600 text-white rounded-2xl font-black text-base shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            Accéder au Portail
                            <ChevronRight className="h-5 w-5" />
                        </Link>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="mt-8 animate-bounce opacity-20">
                    <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center p-1.5 font-sans">
                        <div className="w-1 h-2 bg-white/50 rounded-full" />
                    </div>
                </div>
            </div>
        </section>
    );
};
