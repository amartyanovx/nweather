'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  MIN_QUERY_LENGTH,
  normalizeForSearch,
  sanitizeCityInput,
  searchCities,
} from '@/lib/cityQuery';
import styles from '@/styles/page.module.css';
import type { CityDTO } from '@/types/weather';

interface Props {
  cities: CityDTO[];
  selected: CityDTO | null;
  onSelect: (city: CityDTO) => void;
  onClear: () => void;
}

export default function CitySearch({ cities, selected, onSelect, onClear }: Props) {
  const [query, setQuery] = useState(selected?.name ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const listId = useId();

  const debouncedQuery = useDebouncedValue(query);
  const suggestions = searchCities(cities, debouncedQuery);
  const hasQuery = normalizeForSearch(debouncedQuery).length >= MIN_QUERY_LENGTH;
  const isListOpen = isOpen && hasQuery;
  const activeCity = isListOpen ? suggestions[activeIndex] : undefined;

  // Клик вне поля закрывает список; выбор мышью внутри контейнера обрабатывает сама опция.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const choose = (city: CityDTO) => {
    setQuery(city.name);
    setActiveIndex(0);
    setIsOpen(false);
    onSelect(city);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(sanitizeCityInput(event.target.value));
    setActiveIndex(0);
    setIsOpen(true);
    // Ввод после выбора сбрасывает город: прогноз и табы скрываются до нового выбора.
    if (selected) onClear();
  };

  const handleClear = () => {
    setQuery('');
    setActiveIndex(0);
    setIsOpen(false);
    onClear();
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!isListOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      const city = suggestions[activeIndex];
      if (city) {
        event.preventDefault();
        choose(city);
      }
    }
  };

  return (
    <div className={styles.search} ref={containerRef}>
      <label className={styles.searchLabel} htmlFor={inputId}>
        Город
      </label>
      <div className={styles.searchField}>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.searchInput}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={isListOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeCity ? `${listId}-${activeCity.slug}` : undefined}
          value={query}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query.length > 0 && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Очистить город"
            onClick={handleClear}
          >
            ×
          </button>
        )}
      </div>
      {isListOpen &&
        (suggestions.length > 0 ? (
          <ul
            id={listId}
            className={styles.suggestions}
            role="listbox"
            aria-label="Подсказки городов"
          >
            {suggestions.map((city, index) => (
              <li
                key={city.slug}
                id={`${listId}-${city.slug}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`${styles.suggestion} ${index === activeIndex ? styles.suggestionActive : ''}`}
                onPointerDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(city)}
              >
                <span className={styles.suggestionName}>{city.name}</span>
                <span className={styles.suggestionMeta}>
                  {city.nameEn} · {city.country}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState} role="status">
            Ничего не найдено
          </p>
        ))}
    </div>
  );
}
