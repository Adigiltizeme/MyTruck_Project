import { motion } from 'framer-motion';
import { errorMessageStyles } from './constants/errorMessages';

export const ErrorMessage = ({ message }: { message: string }) => (
    <motion.p
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`${errorMessageStyles.container} ${errorMessageStyles.text}`}
    >
        <span className={errorMessageStyles.icon}>⚠</span>
        {message}
    </motion.p>
);