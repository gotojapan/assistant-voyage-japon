const fs = require('fs');
const path = require('path');

let kyotoData = null;

function chargerDonneesKyoto() {
  if (!kyotoData) {
    kyotoData = {
      temples: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_temples.json'), 'utf8')),
      gastronomie: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_gastronomie.json'), 'utf8')),
      installations: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_installations_touristiques.json'), 'utf8')),
      hebergements: JSON.parse(fs.readFileSync(path.resolve('data/kyoto_accommodations.json'), 'utf8')),
    };
  }
}

function enrichirJournee(ville, interets = []) {
  if (ville !== "Kyoto") return null;

  chargerDonneesKyoto();

  const filtreParTags = (base) =>
    base.filter(item =>
      interets.some(tag => item.tags?.includes(tag.toLowerCase()))
    );

  return {
    temples: filtreParTags(kyotoData.temples).slice(0, 3),
    gastronomie: filtreParTags(kyotoData.gastronomie).slice(0, 2),
    lieux: filtreParTags(kyotoData.installations).slice(0, 3),
    hebergements: filtreParTags(kyotoData.hebergements).slice(0, 2),
  };
}

module.exports = { enrichirJournee };

