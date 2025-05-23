import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface Stakeholder {
    id: number;
    image: string;
    title: string;
    description: string;
    role: string;
    animation: typeof driverAnimation | typeof storeManagerAnimation | typeof adminAnimation | typeof customerAnimation; // Type de l'animation
}

// Animations spécifiques pour chaque rôle
const driverAnimation = {
    initial: { y: 0, rotate: 0 },
    animate: {
        y: [0, -10, 0],
        rotate: [0, -5, 5, 0],
        transition: {
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
        }
    }
};

const storeManagerAnimation = {
    initial: { scale: 1, rotate: 0 },
    animate: {
        scale: [1, 1.05, 1],
        rotate: [0, -3, 3, 0],
        transition: {
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
        }
    }
};

const adminAnimation = {
    initial: { scale: 1, y: 0 },
    animate: {
        scale: [1, 1.1, 1],
        y: [0, -5, 0],
        transition: {
            duration: 2.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
        }
    }
};

const customerAnimation = {
    initial: { rotate: 0 },
    animate: {
        rotate: [0, 10, 0],
        transition: {
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
        }
    }
};

const stakeholders: Stakeholder[] = [
    {
        id: 1,
        image: '/images/3d-figures/travailleur-demenage.jpg',
        title: 'Responsables Magasins',
        description: 'Coordonnent les commandes et assurent le suivi client',
        role: 'Gestion & Coordination',
        animation: storeManagerAnimation
    },
    {
        id: 2,
        image: '/images/3d-figures/fleche-cible-leader-tir.jpg',
        title: 'Administration MyTruck',
        description: 'Orchestrent l\'ensemble des opérations et optimisent les tournées',
        role: 'Pilotage & Optimisation',
        animation: adminAnimation
    },
    {
        id: 3,
        image: '/images/3d-figures/transportant-meubles-plantes.jpg',
        title: 'Transporteurs',
        description: 'Les héros du dernier kilomètre, assurant des livraisons précises et professionnelles',
        role: 'Transport & Livraison',
        animation: driverAnimation
    },
    {
        id: 4,
        image: '/images/3d-figures/pngegg.png',
        title: 'Clients Finaux',
        description: 'Bénéficient d\'un service de livraison premium et personnalisé',
        role: 'Destinataires',
        animation: customerAnimation
    }
];

const StakeholderFigure: React.FC<{ stakeholder: Stakeholder }> = ({ stakeholder }) => {

    return (
        <div className="relative w-64 h-64">
            <motion.div
                className="w-full h-full"
                initial="initial"
                animate="animate"
            // variants={stakeholder.animation}
            >
                <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <img
                        src={stakeholder.image}
                        alt={stakeholder.title}
                        className="w-full h-full object-contain"
                        style={{
                            filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.2))'
                        }}
                    />
                </motion.div>
            </motion.div>
        </div>
    );
};

const StakeholdersCarousel: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const [direction, setDirection] = useState<'left' | 'right'>('right');

    useEffect(() => {
        if (!isAutoPlay) return;
        const timer = setInterval(() => {
            setDirection('right');
            setCurrentIndex((prev) => (prev + 1) % stakeholders.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [isAutoPlay]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const swipeThreshold = 50;
        if (Math.abs(info.offset.x) > swipeThreshold) {
            const newDirection = info.offset.x > 0 ? 'left' : 'right';
            setDirection(newDirection);
            setCurrentIndex((prev) => {
                if (newDirection === 'right') {
                    return prev === stakeholders.length - 1 ? 0 : prev + 1;
                }
                return prev === 0 ? stakeholders.length - 1 : prev - 1;
            });
        }
    };

    const slideVariants = {
        enter: (direction: 'left' | 'right') => ({
            x: direction === 'right' ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        },
        exit: (direction: 'left' | 'right') => ({
            x: direction === 'right' ? -1000 : 1000,
            opacity: 0,
            scale: 0.8
        })
    };

    return (
        <div className="relative w-full h-[600px] overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={handleDragEnd}
                    className="absolute inset-0 flex flex-col items-center justify-center px-4 touch-pan-y"
                >
                    <StakeholderFigure stakeholder={stakeholders[currentIndex]} />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-center"
                    >
                        <h3 className="text-3xl font-bold mb-4">
                            {stakeholders[currentIndex].title}
                        </h3>
                        <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                            {stakeholders[currentIndex].description}
                        </p>
                        <span className="inline-block bg-red-600 text-white px-4 py-2 rounded-full">
                            {stakeholders[currentIndex].role}
                        </span>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation dots avec effet de survol */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                {stakeholders.map((_, index) => (
                    <motion.button
                        key={index}
                        onClick={() => {
                            setDirection(index > currentIndex ? 'right' : 'left');
                            setCurrentIndex(index);
                            setIsAutoPlay(false);
                        }}
                        className={`w-3 h-3 rounded-full transition-colors ${index === currentIndex ? 'bg-red-600' : 'bg-gray-300'
                            }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                    />
                ))}
            </div>

            {/* Toggle autoplay */}
            <motion.button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className="absolute top-4 right-4 px-4 py-2 bg-white/80 rounded-full text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isAutoPlay ? 'Pause' : 'Auto'}
            </motion.button>
        </div>
    );
};

export default React.memo(StakeholdersCarousel);