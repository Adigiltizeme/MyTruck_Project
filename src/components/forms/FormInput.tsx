import { AnimatePresence, motion } from "framer-motion";
import React from "react";

const inputVariants = {
    focus: {
        scale: 1.02,
        borderColor: '#DC2626',
        transition: {
            duration: 0.2
        }
    },
    error: {
        x: [-2, 2, -2, 2, 0],
        transition: {
            duration: 0.4
        }
    }
};

interface FormInputProps {
    label: string;
    subLabel?: string;
    placeholder?: string;
    name: string;
    value: string | number;
    min?: number;
    max?: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearch?: (query: string) => void;
    onSearchSelect?: (suggestion: any) => void;
    error?: string;
    type?: string;
    required?: boolean;
}

const FormInput = React.memo(({
    label,
    subLabel,
    placeholder,
    name,
    value,
    min,
    max,
    onChange,
    onSearch,
    onSearchSelect,
    error,
    type = 'text',
    required = false
}: FormInputProps) => {
    return (
        <AnimatePresence>
            <motion.div className="space-y-1"
                variants={inputVariants}
                animate={error ? 'error' : 'focus'}
            >
                <label className="block text-sm font-bold text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                {subLabel && <p className="text-sm text-gray-500">{subLabel}</p>}
                <input
                    type={type}
                    placeholder={placeholder}
                    name={name}
                    value={value || ''}
                    min={min}
                    max={max}
                    onChange={onChange}
                    onInput={onSearch ? (e) => onSearch(e.currentTarget.value) : undefined}
                    list={onSearch ? `${name}-suggestions` : undefined}
                    className={`mt-1 block w-full rounded-md border ${error ? 'border-red-500' : 'border-gray-300'
                        }`}
                    required={required}
                />
                {error && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-500 text-sm mt-1"
                    >
                        {error}
                    </motion.p>
                )}
            </motion.div>
        </AnimatePresence>
    );
});

FormInput.displayName = 'FormInput';

export default FormInput;