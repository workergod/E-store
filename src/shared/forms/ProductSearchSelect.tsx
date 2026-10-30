import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Product } from '../types/Product';

interface ProductSearchSelectProps {
  value: string;
  productName?: string;
  onChange: (productId: string, productName?: string, product?: Product) => void;
  products: Product[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean;
}

export function ProductSearchSelect({
  value,
  productName,
  onChange,
  products = [],
  placeholder = "Type to search product...",
  error = false,
  disabled = false,
  className,
  allowCustom = false
}: ProductSearchSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === value);
  }, [products, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => productName || selectedProduct?.name || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [openAbove, setOpenAbove] = useState(false);

  const updateDirection = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    // If less than 280px below and more space above, open upwards
    setOpenAbove(spaceBelow < 280 && rect.top > 250);
  }, []);

  // Update opening direction when opening or on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updateDirection();

    const handleScrollOrResize = () => {
      updateDirection();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateDirection]);

  // Synchronize search term when value or productName changes from outside
  useEffect(() => {
    if (productName !== undefined) {
      setSearchTerm(productName);
    } else if (selectedProduct) {
      setSearchTerm(selectedProduct.name);
    } else if (!allowCustom && !value) {
      setSearchTerm('');
    }
  }, [productName, selectedProduct, allowCustom, value]);

  // Scroll highlighted item into view on keyboard navigation
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [isOpen, highlightedIndex]);

  // Handle click outside to close dropdown and commit typed value if custom allowed
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
        if (allowCustom) {
          const trimmed = searchTerm.trim();
          if (trimmed) {
            const matched = products.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
            if (matched) {
              onChange(matched.id, matched.name, matched);
            } else {
              onChange('', trimmed);
            }
          } else {
            onChange('', '');
          }
        } else {
          // Reset search term back to selected product name if not picking something new
          if (selectedProduct) {
            setSearchTerm(selectedProduct.name);
          } else {
            setSearchTerm('');
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedProduct, allowCustom, searchTerm, products, onChange]);

  // Filter and smart sort products
  const filteredProducts = useMemo(() => {
    const rawTerm = searchTerm.toLowerCase().trim();
    let list = [...products];

    // If an item is already selected and input matches exactly, allow viewing all products on open
    const isMatchingSelected = selectedProduct && rawTerm === selectedProduct.name.toLowerCase().trim();

    if (rawTerm && !isMatchingSelected) {
      const words = rawTerm.split(/\s+/).filter(Boolean);
      list = list.filter(p => {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const shortName = (p.shortName || '').toLowerCase();
        return words.every(w => name.includes(w) || sku.includes(w) || shortName.includes(w));
      });

      // Smart sorting:
      // 1. Starts with search term
      // 2. Alphabetical order
      list.sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aStarts = aName.startsWith(rawTerm);
        const bStarts = bName.startsWith(rawTerm);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aName.localeCompare(bName);
      });
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [products, searchTerm, selectedProduct]);

  const handleSelect = (product: Product) => {
    if (!product.id) return;
    onChange(product.id, product.name, product);
    setSearchTerm(product.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSelectCustom = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const matched = products.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (matched) {
      onChange(matched.id, matched.name, matched);
      setSearchTerm(matched.name);
    } else {
      onChange('', trimmed);
      setSearchTerm(trimmed);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setSearchTerm('');
    setIsOpen(true);
    updateDirection();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      updateDirection();
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
      } else if (allowCustom && searchTerm.trim()) {
        handleSelectCustom(searchTerm);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hasExactMatch = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    return Boolean(trimmed && products.some(p => p.name.toLowerCase() === trimmed));
  }, [searchTerm, products]);

  const hasValue = Boolean(value || (allowCustom && searchTerm.trim()));

  return (
    <div ref={containerRef} className={cn("relative w-full", isOpen ? "z-50" : "z-10", className)}>
      <div 
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            updateDirection();
            inputRef.current?.focus();
          }
        }}
        className={cn(
          "relative flex items-center w-full h-10 rounded-md border bg-background transition-all cursor-text",
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
          onFocus={() => {
            setIsOpen(true);
            updateDirection();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
            updateDirection();
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            setIsOpen(true);
            setHighlightedIndex(-1);
            updateDirection();
            if (allowCustom) {
              const matched = products.find(p => p.name.toLowerCase() === val.trim().toLowerCase());
              if (matched) {
                onChange(matched.id, matched.name, matched);
              } else {
                onChange('', val);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground truncate"
        />

        {hasValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
            title="Clear product"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextOpen = !isOpen;
              setIsOpen(nextOpen);
              if (nextOpen) {
                updateDirection();
                inputRef.current?.focus();
              }
            }}
            className="p-1 mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Floating Dropdown Menu rendered inside DOM tree for guaranteed mouse/hover & dialog compatibility */}
      {isOpen && (
        <div 
          className={cn(
            "absolute left-0 w-full min-w-[320px] max-w-lg bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100",
            openAbove ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {/* Quick Option to use typed text as Custom Item */}
          {allowCustom && searchTerm.trim() && !hasExactMatch && (
            <div 
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectCustom(searchTerm);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border-b border-border text-xs font-semibold cursor-pointer transition-colors select-none"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Use typed item: <strong className="underline">&quot;{searchTerm.trim()}&quot;</strong>
              </span>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {allowCustom && searchTerm.trim() ? (
                  <span>
                    No catalog items found. Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] border border-border">Enter</kbd> to order &quot;<strong>{searchTerm.trim()}</strong>&quot; as a custom item.
                  </span>
                ) : (
                  <span>No matching products found. Try typing a different name or SKU.</span>
                )}
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
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    onMouseDown={(e) => {
                      // Prevent input blur before selection
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(p);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors select-none",
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
                        {p.sku && <span className="font-mono bg-muted px-1 rounded text-[11px]">SKU: {p.sku}</span>}
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
