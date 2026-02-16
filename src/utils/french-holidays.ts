/**
 * Utilitaire pour détecter les jours fériés français
 */

/**
 * Jours fériés fixes français (même date chaque année)
 */
const FIXED_HOLIDAYS = [
  { month: 0, day: 1 },   // 1er janvier - Jour de l'An
  { month: 4, day: 1 },   // 1er mai - Fête du Travail
  { month: 4, day: 8 },   // 8 mai - Victoire 1945
  { month: 6, day: 14 },  // 14 juillet - Fête Nationale
  { month: 7, day: 15 },  // 15 août - Assomption
  { month: 10, day: 1 },  // 1er novembre - Toussaint
  { month: 10, day: 11 }, // 11 novembre - Armistice 1918
  { month: 11, day: 25 }, // 25 décembre - Noël
];

/**
 * Calcule la date de Pâques pour une année donnée (algorithme de Meeus/Jones/Butcher)
 * @param year Année
 * @returns Date de Pâques
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // -1 car les mois JS commencent à 0
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

/**
 * Calcule les jours fériés mobiles français pour une année donnée
 * @param year Année
 * @returns Tableau de dates des jours fériés mobiles
 */
function calculateMovableHolidays(year: number): Date[] {
  const easter = calculateEaster(year);
  const easterTime = easter.getTime();

  return [
    new Date(easterTime + 1 * 24 * 60 * 60 * 1000), // Lundi de Pâques (Dimanche de Pâques + 1 jour)
    new Date(easterTime + 39 * 24 * 60 * 60 * 1000), // Jeudi de l'Ascension (Pâques + 39 jours)
    new Date(easterTime + 50 * 24 * 60 * 60 * 1000), // Lundi de Pentecôte (Pâques + 50 jours)
  ];
}

/**
 * Vérifie si une date est un jour férié français
 * @param date Date à vérifier
 * @returns true si la date est un jour férié français
 */
export function isFrenchHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Vérifier les jours fériés fixes
  const isFixedHoliday = FIXED_HOLIDAYS.some(
    holiday => holiday.month === month && holiday.day === day
  );

  if (isFixedHoliday) {
    return true;
  }

  // Vérifier les jours fériés mobiles
  const movableHolidays = calculateMovableHolidays(year);
  return movableHolidays.some(
    holiday =>
      holiday.getFullYear() === year &&
      holiday.getMonth() === month &&
      holiday.getDate() === day
  );
}

/**
 * Vérifie si une date est un dimanche
 * @param date Date à vérifier
 * @returns true si la date est un dimanche
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Vérifie si une date nécessite une majoration (dimanche ou jour férié)
 * @param date Date à vérifier
 * @returns true si la date nécessite une majoration
 */
export function requiresSurchargeMajoration(date: Date): boolean {
  return isSunday(date) || isFrenchHoliday(date);
}

/**
 * Retourne le libellé de la raison de la majoration
 * @param date Date à vérifier
 * @returns Libellé de la raison ou null si pas de majoration
 */
export function getMajorationReason(date: Date): string | null {
  if (isSunday(date) && isFrenchHoliday(date)) {
    return 'Dimanche + Jour férié';
  }
  if (isSunday(date)) {
    return 'Dimanche';
  }
  if (isFrenchHoliday(date)) {
    return 'Jour férié';
  }
  return null;
}
