import type { SearchMode } from '../lib/types';

const modes: { value: SearchMode; label: string }[] = [
  { value: 'fair', label: '公平重視' },
  { value: 'balanced', label: 'バランス' },
  { value: 'total', label: '合計重視' },
];

interface ModeSelectorProps {
  value: SearchMode;
  onChange: (value: SearchMode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <fieldset className="mode-selector">
      <legend>探索モード</legend>
      <div className="segments">
        {modes.map((mode) => (
          <label className={value === mode.value ? 'selected' : ''} key={mode.value}>
            <input
              type="radio"
              name="mode"
              value={mode.value}
              checked={value === mode.value}
              onChange={() => onChange(mode.value)}
            />
            <span>{mode.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
