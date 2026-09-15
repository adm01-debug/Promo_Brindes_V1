import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buildCampaignCatalogUrl,
  CAMPAIGN_AUDIENCES,
  CAMPAIGN_MOODS,
  CAMPAIGN_MOMENTS,
  CAMPAIGN_SCALES,
  campaignSelectionCount,
  type CampaignSelection,
} from '../lib/campaignPresets';
import { trackFunnelEvent } from '../lib/analytics';

const steps = [
  { key: 'moment' as const, eyebrow: '01 / MOMENTO', title: 'O que está acontecendo?', options: CAMPAIGN_MOMENTS },
  { key: 'audience' as const, eyebrow: '02 / PESSOAS', title: 'Quem precisa ser encantado?', options: CAMPAIGN_AUDIENCES },
  { key: 'scale' as const, eyebrow: '03 / ESCALA', title: 'Quantas pessoas, aproximadamente?', options: CAMPAIGN_SCALES },
  { key: 'mood' as const, eyebrow: '04 / CLIMA', title: 'Que sensação a escolha deve passar?', options: CAMPAIGN_MOODS },
];

export function CampaignFinder() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<CampaignSelection>({});
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  if (!step) throw new Error('Etapa de briefing inválida.');
  const selectedCount = campaignSelectionCount(selection);

  function select(value: string) {
    const currentStep = steps[stepIndex];
    if (!currentStep) return;
    setSelection((current) => ({ ...current, [currentStep.key]: value }));
    if (stepIndex < steps.length - 1) setStepIndex((current) => current + 1);
  }

  function showResults() {
    if (!selectedCount) return;
    trackFunnelEvent('campaign_finder_completed', {
      moment: selection.moment ?? 'nao-informado',
      audience: selection.audience ?? 'nao-informado',
      scale: selection.scale ?? 'nao-informado',
      mood: selection.mood ?? 'nao-informado',
      choices: selectedCount,
    });
    void navigate(buildCampaignCatalogUrl(selection));
  }

  return (
    <section id="ache-pelo-briefing" className="brief-finder section" aria-labelledby="brief-finder-title">
      <div className="container brief-finder__shell">
        <div className="brief-finder__intro">
          <span className="section-kicker">Ache pelo briefing</span>
          <h2 id="brief-finder-title">Você traz a intenção. O radar encontra caminhos.</h2>
          <p>Não precisa saber o nome do produto. Responda no seu ritmo e abra uma seleção que já conversa com a campanha.</p>
          <div className="brief-finder__trust"><Sparkles /><span><strong>Sem cadastro.</strong> Você pode pular qualquer etapa e ajustar tudo no catálogo.</span></div>
        </div>

        <div className="brief-finder__panel">
          <div className="brief-finder__progress" aria-label={`Etapa ${stepIndex + 1} de ${steps.length}`}>
            {steps.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={`${index === stepIndex ? 'is-current' : ''} ${selection[item.key] ? 'is-complete' : ''}`}
                onClick={() => setStepIndex(index)}
                aria-label={`Ir para etapa ${index + 1}: ${(item.eyebrow.split(' / ')[1] || item.eyebrow).toLocaleLowerCase('pt-BR')}`}
              >
                {selection[item.key] ? <Check size={13} /> : index + 1}
              </button>
            ))}
          </div>

          <div className="brief-finder__question" aria-live="polite">
            <span>{step.eyebrow}</span>
            <h3>{step.title}</h3>
          </div>
          <div className="brief-finder__options">
            {step.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={selection[step.key] === option.value ? 'is-selected' : ''}
                aria-pressed={selection[step.key] === option.value}
                onClick={() => select(option.value)}
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
                {selection[step.key] === option.value && <Check size={18} />}
              </button>
            ))}
          </div>

          <div className="brief-finder__actions">
            <button type="button" className="brief-finder__back" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className="brief-finder__skip" onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))} disabled={stepIndex === steps.length - 1}>
              Pular etapa
            </button>
            <button type="button" className="button button--green" disabled={!selectedCount} onClick={showResults}>
              Ver minha curadoria <ArrowRight size={17} />
            </button>
          </div>
          {selectedCount > 0 && (
            <button className="brief-finder__reset" type="button" onClick={() => { setSelection({}); setStepIndex(0); }}>
              <RotateCcw size={14} /> Recomeçar · {selectedCount} {selectedCount === 1 ? 'escolha feita' : 'escolhas feitas'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
