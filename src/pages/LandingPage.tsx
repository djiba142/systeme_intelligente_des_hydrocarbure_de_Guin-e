import React from 'react';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingStats } from '@/components/landing/LandingStats';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingServices } from '@/components/landing/LandingServices';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans overflow-x-hidden">
            <LandingNavbar />
            <main>
                <LandingHero />
                <LandingStats />
                <LandingServices />
                <LandingFeatures />
            </main>
            <LandingFooter />
        </div>
    );
}
