import { useMemo, useState } from 'react';
import { searchStations } from '../lib/search';
import type { GraphData } from '../lib/types';

interface StationInputProps {
  graph: GraphData | null;
  value: string;
  stationIndex: number | null;
  error: string | null;
  label: string;
  onChange: (text: string) => void;
  onSelect: (stationIndex: number, stationName: string) => void;
}

export function StationInput({
  graph,
  value,
  stationIndex,
  error,
  label,
  onChange,
  onSelect,
}: StationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useMemo(() => (graph ? searchStations(graph, value) : []), [graph, value]);
  const listId = `${label}-suggestions`;

  const selectSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) {
      return;
    }
    onSelect(suggestion.stationIndex, suggestion.station.n);
    setIsOpen(false);
    setActiveIndex(0);
  };

  return (
    <div className="station-input">
      <label>
        <span>{label}</span>
        <input
          type="text"
          value={value}
          placeholder="例: 渋谷"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${label}-error` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (!isOpen || suggestions.length === 0) {
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              selectSuggestion(activeIndex);
            } else if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />
      </label>

      {stationIndex !== null && !error ? <span className="input-status">選択済み</span> : null}

      {isOpen && suggestions.length > 0 ? (
        <ul className="suggestions" id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.stationIndex}>
              <button
                type="button"
                className={index === activeIndex ? 'active' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(index)}
                role="option"
                aria-selected={index === activeIndex}
              >
                <strong>{suggestion.station.n}</strong>
                <span>
                  {suggestion.prefectureName}
                  {suggestion.representativeLineName ? `・${suggestion.representativeLineName}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="input-error" id={`${label}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
