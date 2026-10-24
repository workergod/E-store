import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown, Wrench } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Tool } from '../types/Tool';

interface ToolSearchSelectProps {
  value: string;
  onChange: (toolId: string) => void;
  tools: Tool[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ToolSearchSelect({
  value,
  onChange,
  tools = [],
  placeholder = "Search tool by name, tag, brand, serial...",
  error = false,
  disabled = false,
  className
}: ToolSearchSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTool = useMemo(() => {
    return tools.find(t => t.id === value);
  }, [tools, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    if (selectedTool) {
      setSearchTerm(`${selectedTool.toolCode ? `[${selectedTool.toolCode}] ` : ''}${selectedTool.name}`);
    } else {
      setSearchTerm('');
    }
  }, [selectedTool]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedTool) {
          setSearchTerm(`${selectedTool.toolCode ? `[${selectedTool.toolCode}] ` : ''}${selectedTool.name}`);
        } else {
          setSearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedTool]);

  const filteredTools = useMemo(() => {
    const rawTerm = searchTerm.toLowerCase().trim();
    let list = [...tools];

    const isMatchingSelected = selectedTool && 
      rawTerm === `${selectedTool.toolCode ? `[${selectedTool.toolCode}] ` : ''}${selectedTool.name}`.toLowerCase().trim();

    if (rawTerm && !isMatchingSelected) {
      const cleanTerm = rawTerm.replace(/[\[\]]/g, '');
      const words = cleanTerm.split(/\s+/).filter(Boolean);
      list = list.filter(t => {
        const name = (t.name || '').toLowerCase();
        const code = (t.toolCode || '').toLowerCase();
        const brand = (t.brand || '').toLowerCase();
        const serial = (t.serialNumber || '').toLowerCase();
        return words.every(w => name.includes(w) || code.includes(w) || brand.includes(w) || serial.includes(w));
      });
    }

    return list;
  }, [tools, searchTerm, selectedTool]);

  const handleSelect = (tool: Tool) => {
    onChange(tool.id!);
    setSearchTerm(`${tool.toolCode ? `[${tool.toolCode}] ` : ''}${tool.name}`);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredTools.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredTools.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredTools.length) {
        handleSelect(filteredTools[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div 
        className={cn(
          "relative flex items-center w-full rounded-lg border bg-background transition-all",
          error ? "border-destructive ring-1 ring-destructive" : "border-input hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled && "opacity-50 pointer-events-none bg-muted/40"
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-10 px-3 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 font-medium"
        />

        <div className="flex items-center gap-1 pr-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            tabIndex={-1}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg custom-scrollbar">
          {filteredTools.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No matching tools found
            </div>
          ) : (
            <ul className="py-1 divide-y divide-border/40">
              {filteredTools.map((t, idx) => {
                const isSelected = t.id === value;
                const isHighlighted = idx === highlightedIndex;
                const isOutOfStock = t.availableQty <= 0;

                return (
                  <li
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-sm",
                      isSelected && "bg-primary/10 font-semibold",
                      isHighlighted && !isSelected && "bg-muted/60",
                      isOutOfStock && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <Wrench className={cn("h-4 w-4 shrink-0", isOutOfStock ? "text-muted-foreground" : "text-primary")} />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {t.toolCode}
                          </span>
                          <span className="font-semibold text-foreground truncate">{t.name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {t.brand && <span>{t.brand} {t.modelNumber ? `• ${t.modelNumber}` : ''}</span>}
                          {t.serialNumber && <span> • SN: {t.serialNumber}</span>}
                          {t.location && <span> • Loc: {t.location}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        t.availableQty > 0 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800"
                      )}>
                        {t.availableQty > 0 ? `${t.availableQty} Avail` : 'Out of Stock'}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
