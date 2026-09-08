import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenComponent(): never {
  throw new Error('falha simulada');
}

describe('recuperação global da interface', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mostra uma recuperação compreensível quando um componente falha', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AppErrorBoundary><BrokenComponent /></AppErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Essa página não carregou como deveria.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar página' })).toBeInTheDocument();
  });
});
