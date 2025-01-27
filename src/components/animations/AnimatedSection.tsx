import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedSectionProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
    children,
    delay = 0,
    className = ''
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.6,
                delay,
                ease: "easeOut"
            }}
            viewport={{ once: true }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// Composant pour les titres animés
export const AnimatedTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = ''
}) => {
    return (
        <motion.h2
            initial={{ opacity: 0, y: -50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className={`text-4xl font-bold mb-8 ${className}`}
        >
            {children}
        </motion.h2>
    );
};

// Composant pour les cartes animées
export const AnimatedCard: React.FC<{
    children: React.ReactNode;
    delay?: number;
    className?: string;
}> = ({ children, delay = 0, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.5,
                delay,
                ease: "easeOut"
            }}
            whileHover={{ scale: 1.02 }}
            viewport={{ once: true }}
            className={`bg-white rounded-xl shadow-lg p-6 ${className}`}
        >
            {children}
        </motion.div>
    );
};

// Composant pour le texte animé
export const AnimatedText: React.FC<{
    children: React.ReactNode;
    delay?: number;
    className?: string;
}> = ({ children, delay = 0, className = '' }) => {
    return (
        <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{
                duration: 0.6,
                delay,
                ease: "easeOut"
            }}
            viewport={{ once: true }}
            className={className}
        >
            {children}
        </motion.p>
    );
};