// Custom Select component - Portal with simple positioning
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';
import { cn } from './utils';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onValueChange,
  placeholder = "Select an option",
  options,
  className,
  disabled = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === selectedValue);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        dropdownRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onValueChange?.(optionValue);
    setIsOpen(false);
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Calculate dropdown position
  const getDropdownStyle = () => {
    if (!triggerRef.current) return {};
    
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 2147483647,
      minWidth: '200px'
    };
  };

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
            "whitespace-nowrap transition-all duration-200 outline-none text-left",
            "border-input bg-input-background text-foreground",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            "hover:border-primary/40 hover:bg-input-background/80",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "h-10",
            !selectedValue && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDownIcon 
            className={cn(
              "size-4 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </button>
      </div>

      {/* Portal dropdown */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={getDropdownStyle()}
          className="bg-card/95 backdrop-blur-xl text-card-foreground border border-primary/20 shadow-2xl rounded-xl overflow-hidden glass-panel max-h-96 overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          <div className="p-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-2 rounded-lg py-2.5 pr-8 pl-3 text-sm",
                  "outline-none select-none transition-all duration-200 text-left",
                  "hover:bg-primary/10 focus:bg-primary/15 hover:text-foreground focus:text-foreground",
                  selectedValue === option.value && "bg-primary/5 text-primary"
                )}
              >
                <span className="truncate">{option.label}</span>
                {selectedValue === option.value && (
                  <span className="absolute right-3 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4 text-primary" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}