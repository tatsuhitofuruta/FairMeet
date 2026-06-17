import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

describe('CSS interaction contracts', () => {
  it('styles the active autocomplete option rendered by StationInput', () => {
    expect(css).toContain('.suggestions li.active');
    expect(css).toContain('.suggestions li:hover');
  });
});
