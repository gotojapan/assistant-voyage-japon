function formatList(item) {
  if (!item) return '';
  if (Array.isArray(item)) return item.join(', ');
  return item;
}

function enrichPrompt(data) {
  const blocs = [];

  // TON
  if (data.ton === 'chaleureux') {
    blocs.push("Adopte un ton chaleureux et humain, comme un ami qui partage ses bons plans.");
  } else if (data.ton === 'professionnel') {
    blocs.push("Garde un ton professionnel, factuel, structuré et sobre.");
  } else if (data.ton === 'inspirationnel') {
    blocs.push("Fais rêver : parle des sensations, des atmosphères, des émotions ressenties pendant le voyage.");
  }

  // STYLE
  if (data.style?.includes('familial')) {
    blocs.push("Inclue des activités adaptées aux enfants ou aux familles (musées interactifs, nature, animaux, etc.).");
  }
  if (data.style?.includes('inspirationnel')) {
    blocs.push("Ajoute une touche poétique et sensorielle à chaque étape du voyage.");
  }
  if (data.style?.includes('professionnel')) {
    blocs.push("Prévois des moments libres ou calmes, adaptés à un voyage professionnel ou business.");
  }

  // INTÉRÊTS
  const interests = data.interests || [];
  if (interests.includes('artisanat')) {
    blocs.push("Propose des ateliers d'artisanat japonais, des visites d’ateliers traditionnels ou de musées de savoir-faire.");
  }
  if (interests.includes('gastronomie')) {
    blocs.push("Inclue des expériences culinaires uniques : izakaya, cours de cuisine, marchés locaux ou restaurants étoilés.");
  }
  if (interests.includes('manga') || interests.includes('culture pop')) {
    blocs.push("Ajoute des lieux liés à la pop culture japonaise : musées manga, cafés à thème, quartiers spécialisés comme Akihabara.");
  }
  if (interests.includes('spiritualité')) {
    blocs.push("Fais découvrir des temples reculés, des lieux de méditation ou des expériences zen.");
  }
  if (interests.includes('nature')) {
    blocs.push("Mets en valeur des paysages naturels, randonnées faciles, onsen, côtes ou forêts sacrées.");
  }

  // RYTHME
  if (data.rythme === 'intense') {
    blocs.push("Remplis chaque journée avec plusieurs activités successives et peu de temps morts.");
  } else if (data.rythme === 'détendu') {
    blocs.push("Laisse des temps de pause et de contemplation entre chaque visite. Privilégie la lenteur et la qualité.");
  }

  // CONCLUSION
  if (data.conclusion === true || data.conclusion === 'oui') {
    blocs.push("Ajoute un paragraphe de conclusion à la fin de l’itinéraire : résume les temps forts, les émotions vécues et les souvenirs laissés.");
  }

  return blocs.join('\n');
}

function generatePrompt(data) {
  const intro = data.mode === "complet"
    ? `Génère un itinéraire de ${data.duration} jours au Japon à partir du ${data.start} avec un budget de ${data.budget}€.
Type de voyage : ${data.type}
Style : ${formatList(data.style)}
Rythme : ${data.rythme}
Déjà allé au Japon ? ${data.deja}
Centres d’intérêt : ${formatList(data.interests)}
Villes souhaitées : ${data.villesSouhaitees}
Lieux à éviter : ${data.lieuxAeviter}
Remarques : ${data.remarques}`
    : `Je souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours (${data.periodeVille}).
Type de voyage : ${data.type}
Style : ${formatList(data.style)}
Rythme : ${data.rythme}
Centres d’intérêt : ${formatList(data.interests)}
Remarques : ${data.remarques}`;

  const enrichissements = enrichPrompt(data);

  const structure = `
Structure impérative :
- Utilise des titres de niveau 2 : ## Jour X : titre
- Utilise des sous-titres de niveau 3 : ### Matin, ### Midi, ### Après-midi, ### Soir
- Chaque moment doit être suivi de texte descriptif
- À la fin de chaque restaurant ou activité, ajoute 👉 [En savoir plus](https://...)
- Pas de bullet points, pas de tableaux, pas de code
`;

  return `${intro}

${enrichissements}

${structure}`;
}

module.exports = { generatePrompt };
