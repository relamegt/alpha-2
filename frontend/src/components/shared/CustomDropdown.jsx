import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomDropdown = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    className = '',
    icon: Icon,
    disabled = false,
    size = 'default',
    width = 'w-full'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${width} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`custom-select-trigger ${width} ${size === 'small' ? 'custom-select-trigger-small' : ''}`}
            >
                <div className="flex items-center gap-2.5 truncate">
                    {Icon && <Icon size={size === 'small' ? 14 : 16} className="text-gray-400 dark:text-gray-500" />}
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={size === 'small' ? 14 : 16}
                    className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-primary-500' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="custom-select-options max-h-72 overflow-y-auto custom-thin-scrollbar">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                        >
                            <div className="flex items-center gap-3 flex-1 truncate">
                                {option.icon && (
                                    <span className="flex-shrink-0 opacity-70">
                                        <option.icon size={16} />
                                    </span>
                                )}
                                <span className="truncate">{option.label}</span>
                            </div>
                            {value === option.value && (
                                <Check size={14} className="text-primary-500 flex-shrink-0" />
                            )}
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center italic">
                            No options available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
