import { Link } from 'react-router-dom';
import { Mail, ChevronRight, MapPin } from 'lucide-react';
import logo from '@/assets/logo.png';

export const LandingFooter = () => {
    return (
        <footer id="contact" className="bg-[#1e3a8a] pt-20 pb-10 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-20">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center">
                            <Link to="/">
                                <img
                                    src={logo}
                                    alt="SIHG Logo"
                                    className="h-16 w-auto brightness-0 invert"
                                />
                            </Link>
                        </div>
                        <p className="text-blue-200 text-lg max-w-sm">
                            Système Intégré des Hydrocarbures de Guinée.
                            Une initiative stratégique pour la sécurité énergétique nationale.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-black text-white text-lg mb-8 uppercase tracking-widest border-b border-white/10 pb-2 inline-block">Ressources</h4>
                        <ul className="space-y-4 text-blue-200 font-medium">
                            <li><Link to="/documentation" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> Documentation</Link></li>
                            <li><Link to="/faq" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> FAQ</Link></li>
                            <li><Link to="/guide" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> Guide</Link></li>
                            <li><Link to="/support" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> Soutien</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-black text-white text-lg mb-8 uppercase tracking-widest border-b border-white/10 pb-2 inline-block">Légal</h4>
                        <ul className="space-y-4 text-blue-200 font-medium">
                            <li><Link to="/mentions-legales" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> Mentions légales</Link></li>
                            <li><Link to="/confidentialite" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> Confidentialité</Link></li>
                            <li><Link to="/cgu" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> CGU</Link></li>
                            <li><Link to="/cookies" className="hover:text-[#f97316] transition-colors flex items-center gap-2 group"><ChevronRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" /> Cookies</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-black text-white text-lg mb-8 uppercase tracking-widest border-b border-white/10 pb-2 inline-block">Contact</h4>
                        <ul className="space-y-4 text-blue-200 font-medium">
                            <li className="flex items-start gap-3">
                                <Mail className="h-5 w-5 text-[#f97316] shrink-0 mt-1" />
                                <span className="break-all">contact@sihg-guinee.gn</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-[#f97316] shrink-0 mt-1" />
                                <span>Conakry, BP 123<br />République de Guinée</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 text-center text-blue-300 text-sm">
                    <p>© {new Date().getFullYear()} SIHG - République de Guinée. Tous droits réservés.</p>
                </div>
            </div>
        </footer>
    );
};
