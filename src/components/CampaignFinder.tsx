import { ArrowLeft, ArrowRight, CalendarDays, Check, Hash, RotateCcw, Sparkles, UsersRound, X } from 'lucide-react';
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
  const [summaryVisible, setSummaryVisible] = useState(false);
  const step = steps[stepIndex];
  if (!step) throw new Error('Etapa de briefing inválida.');
  const selectedCount = campaignSelectionCount(selection);
  const summaryItems = [
    { key: 'moment' as const, label: CAMPAIGN_MOMENTS.find((option) => option.value === selection.moment)?.label, eyebrow: 'Momento', icon: CalendarDays, stepIndex: 0 },
    { key: 'audience' as const, label: CAMPAIGN_AUDIENCES.find((option) => option.value === selection.audience)?.label, eyebrow: 'Pessoas', icon: UsersRound, stepIndex: 1 },
    { key: 'scale' as const, label: CAMPAIGN_SCALES.find((option) => option.value === selection.scale)?.label, eyebrow: 'Escala', icon: Hash, stepIndex: 2 },
    { key: 'mood' as const, label: CAMPAIGN_MOODS.find((option) => option.value === selection.mood)?.label, eyebrow: 'Clima', icon: Sparkles, stepIndex: 3 },
  ].filter((item) => item.label);

  function select(value: string) {
    const currentStep = steps[stepIndex];
    if (!currentStep) return;
    const nextSelection = { ...selection, [currentStep.key]: value } as CampaignSelection;
    setSelection(nextSelection);
    if (campaignSelectionCount(nextSelection) === steps.length) {
      setSummaryVisible(true);
      return;
    }
    if (stepIndex < steps.length - 1) setStepIndex((current) => current + 1);
  }

  function editStep(index: number) {
    setSummaryVisible(false);
    setStepIndex(index);
  }

  function removeSelection(key: keyof CampaignSelection, index: number) {
    setSelection((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    editStep(index);
  }

  function reset() {
    setSelection({});
    setStepIndex(0);
    setSummaryVisible(false);
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
          <div className="brief-finder__progress" aria-label={summaryVisible ? `Briefing concluído: ${selectedCount} de ${steps.length} escolhas` : `Etapa ${stepIndex + 1} de ${steps.length}`}>
            {steps.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={`${!summaryVisible && index === stepIndex ? 'is-current' : ''} ${selection[item.key] ? 'is-complete' : ''}`}
                onClick={() => editStep(index)}
                aria-label={`Ir para etapa ${index + 1}: ${(item.eyebrow.split(' / ')[1] || item.eyebrow).toLocaleLowerCase('pt-BR')}`}
                aria-current={!summaryVisible && index === stepIndex ? 'step' : undefined}
              >
                {selection[item.key] ? <Check size={13} /> : index + 1}
              </button>
            ))}
          </div>

          {summaryVisible ? (
            <div className="brief-finder__summary" aria-live="polite">
              <div className="brief-finder__summary-heading">
                <span>SEU BRIEFING</span>
                <h3>O que entendemos da sua campanha</h3>
                <p>Confira antes de continuar. Você pode ajustar qualquer resposta.</p>
              </div>
              <div className="brief-finder__summary-grid">
                {summaryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.key}>
                      <Icon size={20} aria-hidden="true" />
                      <div><small>{item.eyebrow}</small><strong>{item.label}</strong></div>
                      <button type="button" onClick={() => removeSelection(item.key, item.stepIndex)} aria-label={`Remover ${item.label} e editar ${item.eyebrow.toLocaleLowerCase('pt-BR')}`}><X size={17} /></button>
                    </article>
                  );
                })}
              </div>
              <div className="brief-finder__summary-actions">
                <button type="button" className="button button--outline" onClick={() => editStep(0)}>Ajustar respostas</button>
                <button type="button" className="button button--green" onClick={showResults}>Ver minha curadoria <ArrowRight size={17} /></button>
              </div>
              <p className="brief-finder__summary-trust"><Check size={16} /> <strong>Sem cadastro.</strong> Você continua no controle.</p>
            </div>
          ) : (
            <>
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
                <button className="brief-finder__reset" type="button" onClick={reset}>
                  <RotateCcw size={14} /> Recomeçar · {selectedCount} {selectedCount === 1 ? 'escolha feita' : 'escolhas feitas'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
