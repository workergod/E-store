import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, X, Check, Plus, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Employee } from '../types/Employee';

interface EmployeeSearchSelectProps {
  value: string; // The selected employee name
  onChange: (name: string, employee?: Employee) => void;
  employees: Employee[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean;
}

export function EmployeeSearchSelect({
  value = '',
  onChange,
  employees = [],
  placeholder = "Type name to select or create...",
  error = false,
  disabled = false,
  className,
  allowCustom = true
}: EmployeeSearchSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedEmployee = useMemo(() => {
    const trimmed = (value || '').toLowerCase().trim();
    if (!trimmed) return null;
    return employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase().trim() === trimmed);
  }, [employees, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Sync internal searchTerm when value prop changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Handle click outside to close dropdown and commit custom text if applicable
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        const trimmed = searchTerm.trim();
        if (trimmed && trimmed !== value) {
          const matched = employees.find(e => `${e.firstName} ${e.lastName}`.toLowerCase().trim() === trimmed.toLowerCase());
          if (matched) {
            onChange(`${matched.firstName} ${matched.lastName}`, matched);
          } else if (allowCustom) {
            onChange(trimmed);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchTerm, value, employees, allowCustom, onChange]);

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    const rawTerm = searchTerm.toLowerCase().trim();
    if (!rawTerm) return employees;

    return employees.filter(e => {
      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
      const role = (e.role || '').toLowerCase();
      const dept = (e.department || '').toLowerCase();
      const code = (e.employeeCode || '').toLowerCase();
      return fullName.includes(rawTerm) || role.includes(rawTerm) || dept.includes(rawTerm) || code.includes(rawTerm);
    });
  }, [employees, searchTerm]);

  const handleSelect = (emp: Employee) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.trim();
    setSearchTerm(fullName);
    onChange(fullName, emp);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleCustomType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchTerm(text);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Propagate custom value directly so form state stays in sync
    const matched = employees.find(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().trim() === text.toLowerCase().trim());
    if (matched) {
      onChange(`${matched.firstName} ${matched.lastName}`, matched);
    } else if (allowCustom) {
      onChange(text);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredEmployees.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredEmployees.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredEmployees.length) {
        handleSelect(filteredEmployees[highlightedIndex]);
      } else if (allowCustom && searchTerm.trim()) {
        const trimmed = searchTerm.trim();
        const matched = employees.find(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().trim() === trimmed.toLowerCase());
        if (matched) {
          handleSelect(matched);
        } else {
          onChange(trimmed);
          setIsOpen(false);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hasExactMatch = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    return Boolean(trimmed && employees.some(e => `${e.firstName} ${e.lastName}`.toLowerCase().trim() === trimmed));
  }, [searchTerm, employees]);

  return (
    <div ref={containerRef} className={cn("relative w-full", isOpen ? "z-50" : "z-10", className)}>
      <div 
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={cn(
          "relative flex items-center w-full h-10 rounded-lg border bg-background transition-all cursor-text",
          error ? "border-destructive ring-1 ring-destructive/40" : "border-input hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <User className="h-4 w-4 ml-3 text-muted-foreground shrink-0 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={handleCustomType}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent px-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
        />

        {searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
            title="Clear employee"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Menu - Aligned 100% directly below the input (Right Side) */}
      {isOpen && !disabled && (
        <div 
          className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Quick Option to use typed text as new/custom technician */}
          {allowCustom && searchTerm.trim() && !hasExactMatch && (
            <div 
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(searchTerm.trim());
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border-b border-border text-xs font-semibold cursor-pointer transition-colors select-none"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Add new technician: <strong>&quot;{searchTerm.trim()}&quot;</strong>
              </span>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {allowCustom && searchTerm.trim() ? (
                  <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] border border-border">Enter</kbd> to assign &quot;<strong>{searchTerm.trim()}</strong>&quot;</span>
                ) : (
                  <span>No technicians found.</span>
                )}
              </div>
            ) : (
              filteredEmployees.map((emp, idx) => {
                const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                const isSelected = (value || '').toLowerCase().trim() === fullName.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={emp.id || fullName}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(emp)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors select-none",
                      isHighlighted ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60",
                      isSelected && "bg-primary/10 font-semibold text-primary"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {emp.firstName.charAt(0)}{emp.lastName ? emp.lastName.charAt(0) : ''}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{fullName}</span>
                        {emp.department && (
                          <span className="text-[11px] text-muted-foreground truncate">{emp.department}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                        {emp.role || 'Staff'}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
