import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

// Catálogo é conteúdo externo: apenas texto e negrito, nunca HTML executável.
function InlineDescription({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part
  ));
}

export function ProductDescription({ text, summary = '' }: { text: string; summary?: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\s*✅\s*/gu, '\n- ').trim();
  const blocks: Array<{ type: 'paragraph' | 'list'; lines: string[] }> = [];
  for (const line of normalized.split('\n')) {
    if (!line.trim()) continue;
    const item = /^\s*[-*•]\s+(.+)/.exec(line);
    const previous = blocks.at(-1);
    if (item && previous?.type === 'list') previous.lines.push(item[1]!);
    else blocks.push({ type: item ? 'list' : 'paragraph', lines: [item ? item[1]! : line.trim()] });
  }
  const plainText = normalized.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^[-*•]\s+/gm, '').replace(/\s+/g, ' ');
  const normalizedSummary = summary.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
  const hasDistinctSummary = Boolean(normalizedSummary && normalizedSummary !== plainText);
  const needsDisclosure = hasDistinctSummary || plainText.length > 360 || blocks.length > 3;
  const excerpt = normalizedSummary || (plainText.length > 220 ? `${plainText.slice(0, 220).replace(/\s+\S*$/, '')}…` : plainText);

  return (
    <div className="product-description">
      <div id={contentId}>
        {needsDisclosure && !expanded ? <p>{excerpt}</p> : blocks.map((block, index) => (
          block.type === 'list'
            ? <ul key={index}>{block.lines.map((line, itemIndex) => <li key={itemIndex}><InlineDescription text={line} /></li>)}</ul>
            : <p key={index}><InlineDescription text={block.lines[0]!} /></p>
        ))}
      </div>
      {needsDisclosure && <button className="product-description__toggle" type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Recolher descrição' : 'Ver descrição completa'}<ChevronDown size={16} aria-hidden="true" />
      </button>}
    </div>
  );
}
