import { describe, expect, it } from 'vitest';
import { commemorativeOccasions, easterDate, filterOccasions, nextOccasion, occasionCalendarFile, occasionsForYear, planningDate, prioritizeUpcomingOccasions, resolveOccasionDate, toDateKey } from './commemorativeDates';

describe('commemorativeDates', () => {
  it('calcula datas móveis brasileiras sem depender do fuso do navegador', () => {
    expect(toDateKey(easterDate(2026))).toBe('2026-04-05');
    expect(toDateKey(resolveOccasionDate({ type: 'easter', offsetDays: -47 }, 2026))).toBe('2026-02-17');
    expect(toDateKey(resolveOccasionDate({ type: 'nth-weekday', month: 5, weekday: 0, occurrence: 2 }, 2026))).toBe('2026-05-10');
    expect(toDateKey(resolveOccasionDate({ type: 'nth-weekday', month: 8, weekday: 0, occurrence: 2 }, 2026))).toBe('2026-08-09');
    expect(toDateKey(resolveOccasionDate({ type: 'nth-weekday', month: 11, weekday: 5, occurrence: 4 }, 2026))).toBe('2026-11-27');
  });

  it('mantém todas as ocasiões ordenadas e com identificadores únicos', () => {
    const occasions = occasionsForYear(2027);
    expect(occasions).toHaveLength(commemorativeOccasions.length);
    expect(new Set(occasions.map((occasion) => occasion.id)).size).toBe(occasions.length);
    expect(occasions.every((occasion, index) => index === 0 || occasion.date >= (occasions[index - 1]?.date || occasion.date))).toBe(true);
  });

  it('filtra por mês, público e busca sem exigir acentos', () => {
    const occasions = occasionsForYear(2026);
    expect(filterOccasions(occasions, { month: 8, audience: 'clientes', query: 'dia cliente' }).map((item) => item.id)).toEqual(['dia-do-cliente']);
    expect(filterOccasions(occasions, { month: 4, audience: 'colaboradores', query: 'maes cuidado' }).map((item) => item.id)).toEqual(['dia-das-maes']);
  });

  it('avança para o ano seguinte depois da última ocasião', () => {
    expect(nextOccasion(new Date(2026, 11, 31, 12)).dateKey).toBe('2027-01-01');
  });

  it('prioriza as próximas oportunidades sem esconder as datas anteriores', () => {
    const ordered = prioritizeUpcomingOccasions(occasionsForYear(2026), new Date(2026, 8, 10, 14));
    expect(ordered[0]?.dateKey).toBe('2026-09-15');
    expect(ordered).toHaveLength(commemorativeOccasions.length);
    expect(ordered.at(-1)?.date.getTime()).toBeLessThan(Date.UTC(2026, 8, 10));
  });

  it('gera evento de dia inteiro e lembrete de planejamento sem deslocar datas', () => {
    const clientDay = occasionsForYear(2026).find((item) => item.id === 'dia-do-cliente');
    expect(clientDay).toBeDefined();
    expect(toDateKey(planningDate(clientDay!))).toBe('2026-07-21');
    const ics = occasionCalendarFile(clientDay!, 'https://example.com/datas-comemorativas?data=dia-do-cliente');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260915');
    expect(ics).toContain('DTEND;VALUE=DATE:20260916');
    expect(ics).not.toContain('DTSTART:');
  });
});
