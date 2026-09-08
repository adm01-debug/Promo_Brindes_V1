# Créditos de terceiros

## Fold Text — React Bits

O componente `src/components/FoldText.tsx` foi adaptado do efeito [Fold Text](https://reactbits.dev/text-animations/fold-text), do projeto [React Bits](https://github.com/DavidHDev/react-bits), distribuído sob a licença MIT com Commons Clause.

A adaptação preserva a linguagem visual do efeito e acrescenta decisões específicas deste site: execução única na headline, tipografia herdada do design system e ausência total de animação quando `prefers-reduced-motion: reduce` está ativo.

## Glitch Text — React Bits

O componente `src/components/GlitchText.tsx` foi adaptado do efeito [Glitch Text](https://reactbits.dev/text-animations/glitch-text), também do React Bits e sob os mesmos termos de licença.

No site Promo Brindes, o efeito deixa de ser um loop infinito: aparece uma vez quando “Drop da vez” entra no viewport, pode ser revisto no hover e é totalmente removido quando o visitante prefere movimento reduzido.
