import { Radio, BarChart3, Layers, Zap, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LandingFeatures = () => {
    return (
        <>
            {/* Features Detail Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <h2 className="text-[#f97316] font-bold tracking-widest text-sm uppercase">Innovation Stratégique</h2>
                        <p className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Une gestion moderne, automatisée & souveraine</p>
                        <p className="text-slate-600 text-lg">Le SIHG remplace les relevés manuels imprécis par une infrastructure numérique de pointe, garantissant une transparence absolue sur l'ensemble du territoire.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Radio className="h-8 w-8" />,
                                title: "Capteurs IoT de Précision",
                                desc: "Nos capteurs ultrasoniques mesurent en continu les niveaux de cuve avec une marge d'erreur inférieure à 0.1%, permettant une visibilité totale et instantanée des stocks disponibles.",
                                color: "bg-blue-50 text-blue-600"
                            },
                            {
                                icon: <BarChart3 className="h-8 w-8" />,
                                title: "Intelligence Prédictive",
                                desc: "Nos algorithmes anticipent les risques de rupture avant qu'ils ne surviennent en analysant les cycles de consommation historiques et les délais logistiques par région.",
                                color: "bg-orange-50 text-orange-600"
                            },
                            {
                                icon: <Layers className="h-8 w-8" />,
                                title: "Supervision Centrale",
                                desc: "Une console de commandement unique pour l'État, offrant une vue consolidée et granulaire de la distribution énergétique pour une réactivité immédiate.",
                                color: "bg-emerald-50 text-emerald-600"
                            }
                        ].map((f, i) => (
                            <div key={i} className="p-10 rounded-[2.5rem] border border-slate-100 hover:border-[#f97316]/20 hover:shadow-2xl hover:shadow-orange-900/5 transition-all group bg-slate-50/50">
                                <div className={`w-16 h-16 ${f.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-sm`}>
                                    {f.icon}
                                </div>
                                <h3 className="text-2xl font-black mb-4 text-[#1e3a8a]">{f.title}</h3>
                                <p className="text-slate-500 leading-relaxed text-sm font-medium">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI Features Section */}
            <section className="py-24 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-20 items-center">
                        <div className="lg:w-1/2 space-y-10">
                            <div className="space-y-4">
                                <h2 className="text-5xl font-black tracking-tight leading-tight">
                                    L'IA au service de la <span className="text-orange-400">Sécurité Nationale</span>.
                                </h2>
                                <p className="text-slate-400 text-lg leading-relaxed">
                                    Le SIHG n'est pas qu'un outil de suivi, c'est un cerveau numérique qui analyse, prévoit et protège les intérêts énergétiques de la République de Guinée.
                                </p>
                            </div>
                            <div className="grid gap-8">
                                {[
                                    { icon: <Zap className="h-7 w-7" />, title: "Alertes Intelligentes Automatisées", desc: "Notification prioritaire par SMS et email dès qu'une station descend sous son seuil de sécurité personnalisé, optimisant la réapprovisionnement." },
                                    { icon: <BarChart3 className="h-7 w-7" />, title: "Planification des Besoins Futurs", desc: "Prévisions basées sur le Machine Learning pour équilibrer les stocks régionaux et éviter les disparités géographiques dans la distribution." },
                                    { icon: <ShieldCheck className="h-7 w-7" />, title: "Traçabilité et Anti-Fraude", desc: "Chaque litre est authentifié numériquement du dépôt à la pompe, éliminant les pertes inconnues et le marché noir." }
                                ].map((f, i) => (
                                    <div key={i} className="flex gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors group">
                                        <div className="text-orange-400 mt-1 p-3 rounded-xl bg-orange-400/10 group-hover:scale-110 transition-transform">{f.icon}</div>
                                        <div>
                                            <h4 className="font-bold text-xl mb-2">{f.title}</h4>
                                            <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:w-1/2 relative">
                            <div className="bg-gradient-to-br from-blue-500/20 to-orange-500/30 absolute inset-0 blur-[100px] rounded-full animate-pulse" />
                            <div className="relative rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] group bg-slate-800">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a8a]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                                <img
                                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=75&w=1000&auto=format&fit=crop"
                                    alt="SIHG Intelligence Dashboard"
                                    className="w-full h-auto transform group-hover:scale-105 transition-all opacity-80 group-hover:opacity-100"
                                    style={{ transitionDuration: '2000ms' }}
                                    loading="lazy"
                                />
                                <div className="absolute bottom-10 left-10 right-10 z-20 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                    <Link to="/auth" className="w-full bg-[#f97316] text-white py-5 rounded-2xl font-black text-center block shadow-2xl hover:bg-orange-600 transition-all text-lg">
                                        Découvrir l'Analyse Avancée
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};
