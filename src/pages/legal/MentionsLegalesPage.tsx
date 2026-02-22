import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Shield, Scale, Building2, Mail } from 'lucide-react';

export default function MentionsLegalesPage() {
    return (
        <LandingLayout>
            <div className="max-w-4xl mx-auto px-4 py-20">
                <h1 className="text-4xl font-black text-[#1e3a8a] mb-8">Mentions Légales</h1>

                <div className="space-y-12 text-slate-600 leading-relaxed">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <Building2 className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Éditeur du site</h2>
                        </div>
                        <p>
                            Le Système Intégré des Hydrocarbures de Guinée (SIHG) est une plateforme officielle éditée par :
                        </p>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="font-bold text-slate-900">Ministère de l'Énergie de la République de Guinée</p>
                            <p>Services de Régulation Énergétique</p>
                            <p>Conakry, République de Guinée</p>
                            <p className="flex items-center gap-2 mt-2">
                                <Mail className="h-4 w-4" />
                                contact@sihg-guinee.gn
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <Scale className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Responsabilité</h2>
                        </div>
                        <p>
                            Le Ministère s'efforce d'assurer au mieux de ses possibilités, l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, les services officiels ne peuvent garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.
                        </p>
                        <p>
                            L'utilisation des données issues du SIHG par des tiers se fait sous leur entière responsabilité.
                        </p> Section : "Souveraineté Énergétique".
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <Shield className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Propriété Intellectuelle</h2>
                        </div>
                        <p>
                            L'ensemble de ce site relève de la législation guinéenne et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                        </p>
                        <p>
                            La marque SONAP et le logo SIHG sont la propriété exclusive de l'État guinéen.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-[#1e3a8a]">Hébergement</h2>
                        <p>
                            La plateforme SIHG est hébergée sur des serveurs sécurisés garantissant la souveraineté des données nationales, conformément aux directives de l'Agence Nationale de la Digitalisation de l'État (ANDE).
                        </p>
                    </section>
                </div>
            </div>
        </LandingLayout>
    );
}
