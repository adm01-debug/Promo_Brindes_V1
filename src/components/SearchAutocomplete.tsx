import { ArrowRight, Search, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useId, useMemo, useState } from 'react';
import { buildSearchSuggestions, type SearchSuggestion } from '../lib/search';
import type { Category } from '../types';

interface SearchAutocompleteProps {
  variant: 'hero' | 'catalog';
  inputId: string;
  label: string;
  value: string;
  placeholder: string;
  categories: Category[];
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSelect: (suggestion: SearchSuggestion) => void;
  onClear?: () => void;
}

export function SearchAutocomplete({
  variant,
  inputId,
  label,
  value,
  placeholder,
  categories,
  onChange,
  onSubmit,
  onSelect,
  onClear,
}: SearchAutocompleteProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = useMemo(() => buildSearchSuggestions(value, categories), [categories, value]);
  const visible = open && suggestions.length > 0;

  useEffect(() => setActiveIndex(-1), [value]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setOpen(false);
    onSubmit(value.trim());
  }

  function choose(suggestion: SearchSuggestion) {
    setOpen(false);
    setActiveIndex(-1);
    onSelect(suggestion);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        if (event.key === 'ArrowDown') return current >= suggestions.length - 1 ? 0 : current + 1;
        return current <= 0 ? suggestions.length - 1 : current - 1;
      });
      return;
    }
    if (event.key === 'Enter' && visible && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    }
  }

  const formClass = variant === 'hero' ? 'hero-search smart-search' : 'catalog-search smart-search';
  const submitClass = variant === 'catalog' ? 'catalog-search__submit' : undefined;

  return (
    <form
      className={formClass}
      role="search"
      onSubmit={submit}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Search size={21} aria-hidden="true" />
      <label className="sr-only" htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); }}
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
      />
      {variant === 'catalog' && value && onClear && (
        <button className="catalog-search__clear" type="button" aria-label="Limpar busca" onClick={() => { setOpen(false); onClear(); }}>
          <X size={18} />
        </button>
      )}
      <button className={submitClass} type="submit">
        {variant === 'hero' ? <>Explorar <ArrowRight size={17} /></> : 'Buscar'}
      </button>
      <div id={listboxId} className={`search-suggestions ${visible ? 'is-open' : ''}`} role="listbox" aria-label="Sugestões de busca">
        {suggestions.map((suggestion, index) => (
          <button
            id={`${listboxId}-${index}`}
            key={suggestion.id}
            type="button"
            role="option"
            aria-selected={activeIndex === index}
            className={activeIndex === index ? 'is-active' : ''}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(suggestion)}
          >
            <span>{suggestion.label}</span>
            <small>{suggestion.kind === 'category' ? 'Categoria' : 'Ideia'}</small>
          </button>
        ))}
      </div>
    </form>
  );
}
