import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Building2, Plus } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Supplier } from '../types/Supplier';

interface SupplierSearchSelectProps {
  supplierId?: string;
  supplierName?: string;
  onChange: (supplierId: string, supplierName: string) => void;
  suppliers: Supplier[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SupplierSearchSelect({
  supplierId = '',
  supplierName = '',
  onChange,
  suppliers = [],
  placeholder = "Type or search supplier name...",
  error = false,
  disabled = false,
  className
}: SupplierSearchSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === supplierId || (s.companyName && s.companyName.toLowerCase() === (supplierName || '').toLowerCase()));
  }, [suppliers, supplierId, supplierName]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(supplierName || selectedSupplier?.companyName || '');

  // Keep search term in sync with incoming supplierName/supplierId
  useEffect(() => {
    if (supplierName) {
      setSearchTerm(supplierName);
    } else if (selectedSupplier) {
      setSearchTerm(selectedSupplier.companyName);
    } else {
      setSearchTerm('');
    }
  }, [supplierName, selectedSupplier]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed something and clicked outside without picking from list, commit the typed name
        if (searchTerm.trim() && searchTerm !== supplierName) {
          const matched = suppliers.find(s => s.companyName.toLowerCase() === searchTerm.trim().toLowerCase());
          if (matched) {
            onChange(matched.id || '', matched.companyName);
          } else {
            onChange('', searchTerm.trim());
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchTerm, supplierName, suppliers, onChange]);

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    const rawTerm = searchTerm.toLowerCase().trim();
    if (!rawTerm) return suppliers;

    return suppliers.filter(s => {
      const name = (s.companyName || '').toLowerCase();
      const contact = (s.contactPerson || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const code = (s.supplierCode || '').toLowerCase();
      return name.includes(rawTerm) || contact.includes(rawTerm) || phone.includes(rawTerm) || code.includes(rawTerm);
    });
  }, [suppliers, searchTerm]);

  const handleSelect = (s: Supplier) => {
    setSearchTerm(s.companyName);
    onChange(s.id || '', s.companyName);
    setIsOpen(false);
  };

  const handleCustomType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchTerm(text);
    setIsOpen(true);
    // Directly propagate typed value so it's not lost even if user doesn't pick an option
    const matched = suppliers.find(s => s.companyName.toLowerCase() === text.trim().toLowerCase());
    if (matched) {
      onChange(matched.id || '', matched.companyName);
    } else {
      onChange('', text);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange('', '');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div 
        className={cn(
          "relative flex items-center w-full h-10 rounded-md border border-input bg-background shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary",
          error && "border-destructive focus-within:ring-destructive",
          disabled && "opacity-50 cursor-not-allowed bg-muted"
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleCustomType}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-full bg-transparent border-0 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />

        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="mr-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            title="Clear supplier"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div 
          className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        >
          <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
            {/* If user typed something not matching any registered supplier, show option to use it */}
            {searchTerm.trim() && !suppliers.some(s => s.companyName.toLowerCase() === searchTerm.trim().toLowerCase()) && (
              <div
                onClick={() => {
                  onChange('', searchTerm.trim());
                  setIsOpen(false);
                }}
                className="p-3 text-sm cursor-pointer bg-primary/5 hover:bg-primary/10 text-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Use supplier name: <strong className="font-semibold">"{searchTerm.trim()}"</strong></span>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-medium">Custom</span>
              </div>
            )}

            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map(s => {
                const isSelected = selectedSupplier?.id === s.id || (s.companyName && s.companyName.toLowerCase() === searchTerm.toLowerCase().trim());
                return (
                  <div
                    key={s.id || s.companyName}
                    onClick={() => handleSelect(s)}
                    className={cn(
                      "p-3 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between",
                      isSelected && "bg-primary/10 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">{s.companyName}</div>
                        {(s.contactPerson || s.phone) && (
                          <div className="text-xs text-muted-foreground">
                            {s.contactPerson} {s.phone ? `• ${s.phone}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                );
              })
            ) : (
              !searchTerm.trim() && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No registered suppliers found. You can type any supplier name directly.
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
