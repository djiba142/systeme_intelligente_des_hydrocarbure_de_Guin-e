import React from 'react';
import systemDash from '@/assets/system_dash.png';
import systemLogistics from '@/assets/system_logistics.png';
import systemCompliance from '@/assets/system_compliance.png';
import { Shield, BarChart3, Truck } from 'lucide-react';

export const LandingSystemExplainer = () => {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">
                        Comprendre le <span className="text-[#f97316]">Système SIHG</span>
                    </h2>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                        Une architecture moderne divisée en piliers stratégiques pour transformer le secteur des hydrocarbures en Guinée.
                    </p>
                </div>

                <div className="space-y-32">
                    {/* Pillar 1 */}
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center text-[#f97316]">
                                <BarChart3 className="h-8 w-8" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-slate-900">Intelligence & Monitoring</h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    Suivi en temps réel des stocks nationaux, alertes automatiques en cas de pénurie et tableaux de bord décisionnels pour une gouvernance optimale du carburant.
                                </p>
                            </div>
                            <ul className="space-y-3 text-slate-600 font-medium">
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                                    Visualisation des stocks par région
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                                    Prévisions de consommation basées sur l'IA
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                                    Gestion automatisée des seuils de rupture
                                </li>
                            </ul>
                        </div>
                        <div className="flex-1">
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-orange-50 rounded-[2.5rem] -z-10 group-hover:scale-105 transition-transform duration-500" />
                                <img 
                                    src={systemDash} 
                                    alt="Intelligence Dashboard" 
                                    className="rounded-[2rem] shadow-2xl w-full object-cover border-8 border-white group-hover:-translate-y-2 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pillar 2 */}
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <Truck className="h-8 w-8" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-slate-900">Logistique & Flux</h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    Traçabilité complète de toute la chaîne d'approvisionnement, du navire à la pompe. Optimisation des trajets et sécurisation des livraisons de carburant.
                                </p>
                            </div>
                            <ul className="space-y-3 text-slate-600 font-medium">
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    Suivi des navires et importations
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    Gestion des dépôts et terminaux
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    Contrôle des camions-citernes par GPS
                                </li>
                            </ul>
                        </div>
                        <div className="flex-1">
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-blue-50 rounded-[2.5rem] -z-10 group-hover:scale-105 transition-transform duration-500" />
                                <img 
                                    src={systemLogistics} 
                                    alt="Logistics Interface" 
                                    className="rounded-[2rem] shadow-2xl w-full object-cover border-8 border-white group-hover:-translate-y-2 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Pillar 3 */}
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Shield className="h-8 w-8" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-slate-900">Conformité & Légalité</h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    Dématérialisation totale des dossiers administratifs et agréments. Sécurisation juridique de chaque transaction et auditabilité permanente du système.
                                </p>
                            </div>
                            <ul className="space-y-3 text-slate-600 font-medium">
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                    Gestion numérique des agréments
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                    Validation multi-niveaux des dossiers
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                    Archivage sécurisé et inaltérable
                                </li>
                            </ul>
                        </div>
                        <div className="flex-1">
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-emerald-50 rounded-[2.5rem] -z-10 group-hover:scale-105 transition-transform duration-500" />
                                <img 
                                    src={systemCompliance} 
                                    alt="Compliance Interface" 
                                    className="rounded-[2rem] shadow-2xl w-full object-cover border-8 border-white group-hover:-translate-y-2 transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
