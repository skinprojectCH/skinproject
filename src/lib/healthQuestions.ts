// Beschriftungen der Gesundheitsfragen aus dem Anmeldeformular (RegisterCustomer.tsx) --
// für die Anzeige von "Ja"-Antworten bei Termin, Kasse und in der Artist-App.
export const HEALTH_QUESTION_LABELS: Record<string, string> = {
  pregnant: 'Schwanger',
  breastfeeding: 'In der Stillzeit',
  epilepsy: 'Epilepsie',
  hiv_aids: 'HIV / AIDS',
  diabetes: 'Diabetes',
  hepatitis: 'Hepatitis',
  skin_conditions: 'Hautkrankheiten / Narben',
  heart_circulation: 'Herz-/Kreislaufprobleme',
  allergies: 'Allergien',
  chronic_illness: 'Chronische Krankheiten',
  sonstiges: 'Sonstiges',
};

// Keine Gesundheitsfragen, sondern Zusatzinfos aus dem Formular.
export const NON_HEALTH_KEYS = new Set(['treatment_type', 'treatment_detail']);
