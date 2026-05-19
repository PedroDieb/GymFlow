export type LoadSuggestion = {
  label: string;
  min: string;
  max: string;
};

const parseLoad = (value?: string | number | null): number | null => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const roundToOneDecimal = (value: number): number => (
  Math.round(value * 10) / 10
);

const formatLoad = (value: number): string => (
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
);

export const getNextLoadSuggestion = (currentLoad?: string | number | null): LoadSuggestion | null => {
  const load = parseLoad(currentLoad);
  if (!load) return null;

  const min = formatLoad(roundToOneDecimal(load * 1.025));
  const max = formatLoad(roundToOneDecimal(load * 1.05));

  return {
    min,
    max,
    label: min === max ? `${min} kg` : `${min} - ${max} kg`,
  };
};
