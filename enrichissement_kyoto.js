import fs from 'fs';
import path from 'path';

let kyotoData = null;

/**
 * Charge les fichiers JSON liés à Kyoto (une seule fois)
 */
function chargerDonneesKyoto() {
  if (!kyotoData) {
    kyotoData = {
      temples: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_temples.json'), 'utf8')),
      gastronomie: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_gastronomie.json'), 'utf8')),
      installations: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_installations_touristiques_enriched.json'), 'utf8')),
      hebergements: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_accommodations.json'), 'utf8')),
    };
  }
}

/**
 * Enrichit une journée à Kyoto avec des suggestions éditoriales.
 * @param {string} ville - Doit être "Kyoto" pour activer l'enrichissement
 * @param {string} quartier - Quartier ciblé (ex. 'Higashiyama')
 * @param {string[]} interets - Tags d’intérêt (ex. ['temple', 'gastronomie'])
 * @returns {object|null} - Suggestions ou null si ville ≠ Kyoto
 */
export function enrichirJournee(ville, quartier, interets = []) {
  if (ville !== "Kyoto") return null;

  chargerDonneesKyoto();

  const matcher = (item) =>
    item.adresse?.includes(quartier) || item.quartier?.includes(quartier);

  const filtreParTags = (base) =>
    base.filter(item =>
      matcher(item) && interets.some(tag => item.tags?.includes(tag.toLowerCase()))
    );

  return {
    temples: filtreParTags(kyotoData.temples).slice(0, 3),
    gastronomie: filtreParTags(kyotoData.gastronomie).slice(0, 2),
    lieux: filtreParTags(kyotoData.installations).slice(0, 3),
    hebergements: filtreParTags(kyotoData.hebergements).slice(0, 2),
  };
}
