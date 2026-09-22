const CAMPAIGN_TIME_ZONE = 'America/Sao_Paulo';

export function currentCampaignYear(now = new Date()): number {
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPAIGN_TIME_ZONE,
    year: 'numeric',
  }).format(now);
  return Number(year);
}

export function supportedCampaignYears(now = new Date()): [number, number] {
  const currentYear = currentCampaignYear(now);
  return [currentYear, currentYear + 1];
}

export function normalizeCampaignYear(value: unknown, now = new Date()): number {
  const years = supportedCampaignYears(now);
  const requested = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(requested) && (requested === years[0] || requested === years[1])
    ? requested
    : years[0];
}
