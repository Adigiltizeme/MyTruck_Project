import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { AnimatedSection, AnimatedTitle, AnimatedCard, AnimatedText } from '../components/animations/AnimatedSection';
import StakeholdersCarousel from '../components/StakeholdersCarousel';
import ContactForm from '../components/ContactForm';
import { href } from 'react-router-dom';

const HomePage: React.FC = () => {
    const controls = useAnimation();
    const ref = useRef(null);
    const isInView = useInView(ref);
    const [showContactForm, setShowContactForm] = useState(false);

    useEffect(() => {
        if (isInView) {
            controls.start('visible');
        }
    }, [controls, isInView]);

    const fadeInVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    const handleContactClick = () => {
        setShowContactForm(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-100">
            {/* Hero Section */}
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black opacity-50"></div>
                    <img
                        src="/myTruck_2024-04-22 233126.png"
                        alt="My Truck Transport et livraison"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="relative z-10 text-left text-white px-4">
                    <motion.h1
                        className="text-5xl md:text-7xl font-bold mb-6 mtruckH1"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        Bienvenue chez<br /> My Truck
                    </motion.h1>
                    <motion.p
                        className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto mTruckSubTitle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                    >
                        Partout. Pour vous !
                    </motion.p>
                </div>
            </section>

            {/* Stakeholders Carousel Section */}
            <section className="py-20">
                <motion.h2
                    className="text-4xl font-bold text-center mb-16"
                    variants={fadeInVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    Les Acteurs de MyTruck
                </motion.h2>
                <StakeholdersCarousel />
            </section>

            {/* Nos Services */}
            <section ref={ref} className="py-20 px-4 max-w-7xl mx-auto">
                <motion.h2
                    className="text-4xl font-bold text-center mb-16"
                    variants={fadeInVariants}
                    initial="hidden"
                    animate={controls}
                >
                    Une histoire de confiance et d'expertise
                </motion.h2>

                <div className="grid md:grid-cols-2 gap-12">
                    <AnimatedSection delay={0.2}>
                        <AnimatedTitle>Notre Engagement</AnimatedTitle>
                        <AnimatedText className="text-lg text-gray-600">
                            Depuis notre création, nous nous engageons à fournir un service de livraison
                            exceptionnel pour les articles volumineux. Chaque livraison est une nouvelle
                            histoire de satisfaction client.
                        </AnimatedText>
                    </AnimatedSection>

                    <AnimatedSection delay={0.4}>
                        <AnimatedTitle>Notre Expertise</AnimatedTitle>
                        <AnimatedText className="text-lg text-gray-600">
                            Notre équipe de chauffeurs expérimentés et notre flotte moderne nous permettent
                            de répondre à tous vos besoins de transport, des plantes aux meubles volumineux.
                        </AnimatedText>
                    </AnimatedSection>
                </div>
            </section>

            {/* Success Stories */}
            <section className="bg-gray-900 text-white py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <motion.h2
                        className="text-4xl font-bold text-center mb-16"
                        variants={fadeInVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        Nos Histoires de Réussite
                    </motion.h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <AnimatedSection delay={0.2} className="bg-white/10 rounded-xl p-6">
                            <blockquote className="text-lg italic mb-4">
                                "Une livraison complexe d'arbres centenaires réalisée avec une précision
                                remarquable. L'équipe a fait preuve d'un professionnalisme exemplaire."
                            </blockquote>
                            <p className="font-semibold">Truffaut Boulogne</p>
                        </AnimatedSection>

                        <AnimatedSection delay={0.4} className="bg-white/10 rounded-xl p-6">
                            <blockquote className="text-lg italic mb-4">
                                "Un service client exceptionnel et une équipe réactive qui a su s'adapter
                                à nos contraintes de dernière minute."
                            </blockquote>
                            <p className="font-semibold">Truffaut Bry-sur-Marne</p>
                        </AnimatedSection>

                        <AnimatedSection delay={0.6} className="bg-white/10 rounded-xl p-6">
                            <blockquote className="text-lg italic mb-4">
                                "La digitalisation de leur service a révolutionné notre gestion des
                                livraisons. Un véritable partenaire de confiance."
                            </blockquote>
                            <p className="font-semibold">Truffaut Ivry</p>
                        </AnimatedSection>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-20 px-4 text-center">
                <div className="max-w-3xl mx-auto">
                    <motion.h2
                        className="text-4xl font-bold mb-8"
                        variants={fadeInVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        Prêt à révolutionner vos livraisons ?
                    </motion.h2>
                    <motion.p
                        className="text-xl text-gray-600 mb-12"
                        variants={fadeInVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                    >
                        Rejoignez les nombreux magasins qui nous font déjà confiance pour
                        leurs livraisons d'articles volumineux.
                    </motion.p>
                    <motion.button
                        onClick={handleContactClick}
                        className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold
                                 hover:bg-red-700 transition-colors"
                        variants={fadeInVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                    >
                        Contactez-nous
                    </motion.button>
                </div>
            </section>

            {/* Footer professionnel */}
            <footer className="bg-gray-900 text-white">
                {/* Footer principal */}
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Informations entreprise */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center mb-4">
                                <img
                                    src="/my-truck-logo.jpg"
                                    alt="My Truck"
                                    className="h-12 w-auto mr-4"
                                />
                                <div>
                                    <h3 className="text-xl font-bold text-red-500">MY TRUCK</h3>
                                    <p className="text-sm text-gray-300">Transport et Livraison</p>
                                </div>
                            </div>
                            <p className="text-gray-300 mb-4 max-w-md">
                                Votre partenaire de confiance pour le transport et la livraison d'articles volumineux.
                                Une expertise reconnue au service de votre satisfaction.
                            </p>
                            <div className="space-y-2 text-sm text-gray-300">
                                <p className="flex items-center">
                                    <span className="mr-2">📍</span>
                                    139, Bd de Stalingrad, 94400 VITRY SUR SEINE
                                </p>
                                <p className="flex items-center">
                                    <span className="mr-2">📞</span>
                                    06 22 15 62 60
                                </p>
                                <p className="flex items-center">
                                    <span className="mr-2">✉️</span>
                                    mytruck.transport@gmail.com
                                </p>
                            </div>
                        </div>

                        {/* Services */}
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-red-500">Nos Services</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>Transport d'articles volumineux</li>
                                <li>Livraison de plantes et jardinage</li>
                                <li>Transport de meubles</li>
                                <li>Livraison express</li>
                                <li>Service équipiers supplémentaires</li>
                                <li>Manutention spécialisée</li>
                            </ul>
                        </div>

                        {/* Contact & Horaires */}
                        <div>
                            <h4 className="text-lg font-semibold mb-4 text-red-500">Contact</h4>
                            <div className="space-y-3 text-sm text-gray-300">
                                <div>
                                    <p className="font-medium text-white">Devis & Renseignements</p>
                                    <button
                                        onClick={handleContactClick}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Contactez-nous en ligne
                                    </button>
                                </div>
                                <div>
                                    <p className="font-medium text-white">Horaires</p>
                                    <p>Lundi - Vendredi : 8h - 18h</p>
                                    <p>Samedi : 8h - 17h</p>
                                    <p>Dimanche : Sur demande</p>
                                </div>
                                <div>
                                    <p className="font-medium text-white">Zone de couverture</p>
                                    <p>Île-de-France et périphérie</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Barre de séparation */}
                <div className="border-t border-red-600"></div>

                {/* Footer légal */}
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="text-sm text-gray-400 text-center md:text-left">
                            <p className="mb-1">
                                <strong className="text-white">MY TRUCK TRANSPORT ET LIVRAISON</strong>
                            </p>
                            <p>
                                RCS Créteil: 851 349 357 | SIRET: 91158475300014 | TVA: FR00911584753
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-400">
                            <button className="hover:text-white transition-colors">
                                Mentions légales
                            </button>
                            <button className="hover:text-white transition-colors">
                                Conditions générales
                            </button>
                            <button className="hover:text-white transition-colors">
                                Politique de confidentialité
                            </button>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="mt-4 pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
                        <p>
                            © {/*new Date().getFullYear()*/}2024 My Truck Transport et Livraison. Tous droits réservés.
                        </p>
                        <p className="mt-1">
                            Conçu pour l'excellence dans le transport d'articles volumineux.
                        </p>
                        <p className="mt-1 secondary">
                            Développé par <button onClick={() => window.open('https://digiltizeme-portfolio.vercel.app', '_blank')} className="hover:text-white transition-colors">DIGILTIZEME</button>
                        </p>
                    </div>
                </div>
            </footer>

            {/* Formulaire de contact */}
            <ContactForm
                isOpen={showContactForm}
                onClose={() => setShowContactForm(false)}
                reason="RENSEIGNEMENTS"
            />
        </div>
    );
};

export default HomePage;