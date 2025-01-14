import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from './Button.tsx';
import '../../styles/theme.css';

// Interfaces
export interface DropdownOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  description?: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string | number | Array<string | number>;
  onChange: (value: string | number | Array<string | number>) => void;
  trigger?: React.ReactNode;
  multiple?: boolean;
  searchable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  ariaLabel?: string;
}

// Custom hook for dropdown logic
const useDropdown = (props: DropdownProps) => {
  const {
    options,
    value,
    onChange,
    multiple,
    searchable,
    disabled
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [announceMessage, setAnnounceMessage] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Memoized filtered options
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, searchable]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true);
          event.preventDefault();
        } else if (activeIndex >= 0) {
          const option = filteredOptions[activeIndex];
          if (!option.disabled) {
            handleOptionSelect(option);
          }
          event.preventDefault();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        event.preventDefault();
        break;
      case 'ArrowDown':
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        event.preventDefault();
        break;
      case 'ArrowUp':
        setActiveIndex(prev => prev > 0 ? prev - 1 : prev);
        event.preventDefault();
        break;
      case 'Home':
        setActiveIndex(0);
        event.preventDefault();
        break;
      case 'End':
        setActiveIndex(filteredOptions.length - 1);
        event.preventDefault();
        break;
    }
  }, [disabled, isOpen, activeIndex, filteredOptions]);

  // Option selection handler
  const handleOptionSelect = useCallback((option: DropdownOption) => {
    if (option.disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValue = currentValues.includes(option.value)
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value];
      onChange(newValue);
      setAnnounceMessage(`${option.label} ${currentValues.includes(option.value) ? 'deselected' : 'selected'}`);
    } else {
      onChange(option.value);
      setIsOpen(false);
      setAnnounceMessage(`${option.label} selected`);
    }
  }, [multiple, value, onChange]);

  return {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    activeIndex,
    filteredOptions,
    dropdownRef,
    searchInputRef,
    optionsRef,
    handleKeyDown,
    handleOptionSelect,
    announceMessage
  };
};

// Dropdown Component
export const Dropdown: React.FC<DropdownProps> = React.memo((props) => {
  const {
    trigger,
    options,
    value,
    multiple = false,
    searchable = false,
    placeholder = 'Select option',
    disabled = false,
    error,
    className = '',
    ariaLabel
  } = props;

  const {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    activeIndex,
    filteredOptions,
    dropdownRef,
    searchInputRef,
    optionsRef,
    handleKeyDown,
    handleOptionSelect,
    announceMessage
  } = useDropdown(props);

  // Selected option label(s)
  const selectedLabel = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      return value.length
        ? `${value.length} selected`
        : placeholder;
    }
    return options.find(opt => opt.value === value)?.label || placeholder;
  }, [value, options, multiple, placeholder]);

  return (
    <div
      ref={dropdownRef}
      className={`dropdown-container relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger */}
      {trigger || (
        <Button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          ariaLabel={ariaLabel || 'Toggle dropdown'}
          ariaPressed={isOpen}
          className={error ? 'error' : ''}
        >
          {selectedLabel}
        </Button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="dropdown-menu absolute w-full mt-1 py-1 bg-background rounded-md shadow-lg"
          role="listbox"
          aria-multiselectable={multiple}
          ref={optionsRef}
        >
          {/* Search Input */}
          {searchable && (
            <div className="px-3 py-2">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full px-2 py-1 border rounded-md"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search options"
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-auto">
            {filteredOptions.map((option, index) => (
              <div
                key={option.value}
                role="option"
                aria-selected={multiple 
                  ? Array.isArray(value) && value.includes(option.value)
                  : value === option.value
                }
                aria-disabled={option.disabled}
                className={`
                  dropdown-option
                  px-3 py-2 cursor-pointer
                  ${activeIndex === index ? 'bg-primary-light' : ''}
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-light'}
                `}
                onClick={() => handleOptionSelect(option)}
              >
                {multiple && (
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(option.value)}
                    readOnly
                    className="mr-2"
                  />
                )}
                {option.icon && <span className="mr-2">{option.icon}</span>}
                <span>{option.label}</span>
                {option.description && (
                  <span className="ml-2 text-sm text-secondary">
                    {option.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screen Reader Announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {announceMessage}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-error text-sm mt-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;