import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductGridSkeleton } from './CatalogFeedback';

describe('ProductGridSkeleton', () => {
  it('anuncia o carregamento com um papel ARIA compatível', () => {
    render(<ProductGridSkeleton count={2} />);

    const loading = screen.getByRole('status', { name: 'Carregando produtos' });
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading.querySelectorAll('.product-skeleton')).toHaveLength(2);
  });
});
