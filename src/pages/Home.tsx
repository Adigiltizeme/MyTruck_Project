import React, { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { AnimatedSection, AnimatedTitle, AnimatedCard, AnimatedText } from '../components/animations/AnimatedSection';
import StakeholdersCarousel from '../components/StakeholdersCarousel';

const HomePage: React.FC = () => {
    const controls = useAnimation();
    const ref = useRef(null);
    const isInView = useInView(ref);

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
        </div>
    );
};

export default HomePage;