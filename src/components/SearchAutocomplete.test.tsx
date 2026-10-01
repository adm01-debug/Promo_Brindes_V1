import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchAutocomplete } from './SearchAutocomplete';

describe('SearchAutocomplete', () => {
  it.each([
    ['hero', 'Busca principal da página inicial'],
    ['catalog', 'Busca principal do catálogo'],
    ['header', 'Busca no cabeçalho'],
  ] as const)('nomeia o landmark de busca %s de forma única', (variant, landmarkLabel) => {
    render(
      <SearchAutocomplete
        variant={variant}
        inputId={`${variant}-search`}
        label="Buscar produtos"
        value=""
        placeholder="Buscar"
        categories={[]}
        onChange={() => undefined}
        onSubmit={() => undefined}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByRole('search', { name: landmarkLabel })).toBeInTheDocument();
  });

  it('remove a opção ativa do leitor de tela quando o campo perde foco', () => {
    render(
      <SearchAutocomplete
        variant="catalog"
        inputId="search"
        label="Buscar produtos"
        value="tech"
        placeholder="Buscar"
        categories={[{ id: 'tech', name: 'Tecnologia', parentId: null }]}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Buscar produtos' });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant');

    fireEvent.blur(input, { relatedTarget: document.body });

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });
});
