import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Product } from '../types/Product';

interface ProductSearchSelectProps {
  value: string;
  onChange: (productId: string) => void;
  products: Product[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ProductSearchSelect({
  value,
  onChange,
  products,
  placeholder = "Type to search product...",
  error = false,
  disabled = false,
  className
}: ProductSearchSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === value);
  }, [products, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Synchronize search term with selected product when value changes
  useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(selectedProduct.name);
    } else {
      setSearchTerm('');
    }
  }, [selectedProduct]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset search term back to selected product name if not picking something new
        if (selectedProduct) {
          setSearchTerm(selectedProduct.name);
        } else {
          setSearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedProduct]);

  // Filter and sort products (Alphabetical A-Z ascending by default)
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let list = [...products];

    if (term && (!selectedProduct || term !== selectedProduct.name.toLowerCase())) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.shortName && p.shortName.toLowerCase().includes(term))
      );
    }

    // Sort Alphabetically Ascending A-Z
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedProduct]);

  const handleSelect = (product: Product) => {
    if (!product.id) return;
    onChange(product.id);
    setSearchTerm(product.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
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
      setHighlightedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div 
        className={cn(
          "relative flex items-center w-full h-10 rounded-md border bg-background transition-all",
          error ? "border-destructive ring-1 ring-destructive/40" : "border-input hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <Search className="h-4 w-4 ml-3 text-muted-foreground shrink-0 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground truncate"
        />

        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            title="Clear product"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            className="p-1 mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[320px] max-w-lg bg-popover text-popover-foreground border border-border rounded-lg shadow-premium z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching products found. Try typing a different name or SKU.
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isSelected = p.id === value;
                const isHighlighted = idx === highlightedIndex;
                const unit = p.unitId || (p as any).unit || 'pcs';
                const stock = Number(p.currentStock) || 0;
                const isLow = stock <= (Number(p.minimumStock) || 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-colors",
                      isHighlighted ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60",
                      isSelected && "bg-primary/10 font-medium text-primary"
                    )}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium truncate">{p.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {p.sku && <span className="font-mono bg-muted px-1 rounded text-[11px]">{p.sku}</span>}
                        {p.shortName && <span>• {p.shortName}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                        stock > 0 
                          ? (isLow ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")
                          : "bg-destructive/10 text-destructive"
                      )}>
                        Stock: {stock} {unit}
                      </span>
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
