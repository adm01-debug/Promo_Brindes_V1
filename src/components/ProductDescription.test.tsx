import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductDescription } from './ProductDescription';

afterEach(cleanup);

describe('descrição compacta e segura do produto', () => {
  it('preserva texto curto sem exigir expansão', () => {
    render(<ProductDescription text="Madeira de reflorestamento. Sem baterias." />);
    expect(screen.getByText('Madeira de reflorestamento. Sem baterias.')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('usa o resumo editorial no estado compacto e revela a descrição integral', () => {
    render(<ProductDescription summary="Resumo curto e objetivo." text="Descrição integral com todos os detalhes técnicos e editoriais." />);
    expect(screen.getByText('Resumo curto e objetivo.')).toBeVisible();
    expect(screen.queryByText('Descrição integral com todos os detalhes técnicos e editoriais.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver descrição completa' }));
    expect(screen.getByText('Descrição integral com todos os detalhes técnicos e editoriais.')).toBeVisible();
  });

  it('formata negrito e converte os marcadores do catálogo em lista sem renderizar HTML', () => {
    const view = render(<ProductDescription text={'**Design sustentável**. ✅ **Madeira** certificada. ✅ Sem baterias.'} />);
    expect(view.container.querySelector('strong')).toHaveTextContent('Design sustentável');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(view.container.textContent).not.toContain('**');
    expect(screen.getByRole('list')).toHaveTextContent('Madeira certificada.');
  });

  it('mantém parágrafos e bullets comuns com quebras CRLF', () => {
    render(<ProductDescription text={'Primeiro parágrafo.\r\n\r\n- Item A\r\n• Item B\r\nÚltimo parágrafo.'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Último parágrafo.')).toBeVisible();
  });

  it('expande toda a descrição e recolhe sem perder o foco do controle', () => {
    const longText = `${'Um produto para sua campanha. '.repeat(20)}**Detalhe final preservado.**`;
    const view = render(<ProductDescription text={longText} />);
    const button = screen.getByRole('button', { name: 'Ver descrição completa' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toBeInTheDocument();
    expect(view.container).not.toHaveTextContent('Detalhe final preservado.');
    button.focus();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveFocus();
    expect(screen.getByText('Detalhe final preservado.')).toBeVisible();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(view.container).not.toHaveTextContent('Detalhe final preservado.');
  });

  it('não interpreta HTML, scripts ou links externos vindos da descrição', () => {
    const text = '<img src=x onerror="alert(1)"> <script>alert(1)</script> [link](javascript:alert(1))';
    const view = render(<ProductDescription text={text} />);
    expect(view.container.textContent).toBe(text);
    expect(view.container.querySelector('img, script, a')).toBeNull();
  });

  it('preserva asteriscos isolados e descrições sem espaços', () => {
    const view = render(<ProductDescription text={`2 * 3: ${'a'.repeat(400)}`} />);
    fireEvent.click(screen.getByRole('button'));
    expect(view.container).toHaveTextContent(`2 * 3: ${'a'.repeat(400)}`);
  });

  it('reinicia recolhida quando uma nova ficha é montada', () => {
    const text = 'Informações detalhadas do catálogo. '.repeat(15);
    const view = render(<ProductDescription key="produto-1" text={text} />);
    fireEvent.click(screen.getByRole('button'));
    view.rerender(<ProductDescription key="produto-2" text={text} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });
});
