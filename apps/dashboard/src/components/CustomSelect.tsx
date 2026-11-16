import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  style?: React.CSSProperties;
  className?: string;
  dropdownMaxHeight?: number;
  theme?: 'dark' | 'light' | 'auto';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  size = 'md',
  width,
  style,
  className,
  dropdownMaxHeight = 260,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Size variations
  const sizeStyles = {
    sm: {
      padding: '5px 10px',
      fontSize: '11px',
      height: '30px',
      iconSize: 13,
    },
    md: {
      padding: '7px 12px',
      fontSize: '12px',
      height: '36px',
      iconSize: 14,
    },
    lg: {
      padding: '9px 14px',
      fontSize: '13.5px',
      height: '42px',
      iconSize: 16,
    },
  }[size];

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: width || 'auto',
        minWidth: width ? undefined : '130px',
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: sizeStyles.height,
          padding: sizeStyles.padding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          backgroundColor: isOpen ? 'var(--qs-select-bg-active, #1e293b)' : 'var(--qs-select-bg, #0f172a)',
          color: selectedOption ? '#f8fafc' : '#94a3b8',
          border: isOpen ? '1px solid #3b82f6' : '1px solid #334155',
          borderRadius: '8px',
          fontSize: sizeStyles.fontSize,
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
          transition: 'all 0.15s ease',
          textAlign: 'left',
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = '#475569';
            e.currentTarget.style.backgroundColor = '#1e293b';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = '#334155';
            e.currentTarget.style.backgroundColor = 'var(--qs-select-bg, #0f172a)';
          }
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {selectedOption?.icon && (
            <span style={{ display: 'inline-flex', flexShrink: 0 }}>
              {selectedOption.icon}
            </span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '1.5px 5px',
                borderRadius: '4px',
                backgroundColor: selectedOption.badgeColor ? `${selectedOption.badgeColor}22` : '#334155',
                color: selectedOption.badgeColor || '#94a3b8',
                border: `1px solid ${selectedOption.badgeColor || '#475569'}44`,
                flexShrink: 0,
              }}
            >
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          size={sizeStyles.iconSize}
          color="#94a3b8"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: '100%',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: `${dropdownMaxHeight}px`,
            overflowY: 'auto',
            padding: '4px',
            animation: 'dropdownFadeIn 0.15s ease-out',
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: size === 'sm' ? '6px 8px' : '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                  color: isSelected ? '#60a5fa' : option.disabled ? '#475569' : '#f1f5f9',
                  fontSize: sizeStyles.fontSize,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!option.disabled && !isSelected) {
                    e.currentTarget.style.backgroundColor = '#1e293b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!option.disabled && !isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {option.icon && (
                    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                      {option.icon}
                    </span>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {option.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                  {option.badge && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: option.badgeColor ? `${option.badgeColor}22` : '#334155',
                        color: option.badgeColor || '#94a3b8',
                      }}
                    >
                      {option.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check size={sizeStyles.iconSize} color="#3b82f6" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
