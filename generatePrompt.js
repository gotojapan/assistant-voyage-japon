import { enrichirJournee } from './enrichissement_kyoto.js';

function formatList(item) {
  if (!item) return 'Non précisé';
  let arr = [];

  if (typeof item === 'string') {
    // séparation manuelle si l'utilisateur a tapé du texte avec virgules
    arr = item.split(',').map(e => e.trim().toLowerCase());
  } else if (Array.isArray(item)) {
    arr = item.map(e => e.trim().toLowerCase());
  }

  // suppression des doublons et normalisation légère
  const unique = [...new Set(arr)].filter(e => e && e.length > 1);

  // capitalisation simple pour affichage dans le prompt
  return unique.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');
}

function sanitizeInput(str) {
  if (!str || typeof str !== 'string') return 'Non précisé';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/["']/g, '')
    .slice(0, 300);
}

function enrichPrompt(data) {
  const blocs = [];
  const style = data.style || [];
  const interests = data.interests || [];
  const rythme = data.rythme || '';
  const type = data.type || '';

  // TON
  if (data.ton === 'chaleureux') {
    blocs.push("Utilise un ton chaleureux, humain, complice, comme un ami qui partage ses bons plans avec enthousiasme.");
  } else if (data.ton === 'professionnel') {
    blocs.push("Adopte un style clair, structuré et synthétique, avec un vocabulaire précis mais accessible.");
  } else if (data.ton === 'inspirationnel') {
    blocs.push("Crée une ambiance immersive : évoque les sensations, les parfums, les sons, les couleurs du Japon à chaque moment.");
  }

  // TYPE DE VOYAGE
  if (type === 'couple') {
    blocs.push("Ajoute des moments romantiques : vues panoramiques, onsen en soirée, balades calmes au coucher du soleil.");
  }
  if (type === 'famille') {
    blocs.push("Privilégie les lieux adaptés aux enfants : musées ludiques, parcs animaliers, pauses régulières, logements pratiques.");
  }
  if (type === 'amis') {
    blocs.push("Propose des lieux vivants ou conviviaux : izakaya, quartiers animés, activités collectives, expériences à partager.");
  }

  // STYLE
  if (style.includes('authentique')) {
    blocs.push("Privilégie les expériences locales, traditionnelles ou peu touristiques, avec une rencontre humaine ou culturelle.");
  }
  if (style.includes('hors des sentiers battus')) {
    blocs.push("Propose des endroits méconnus ou insolites : villages reculés, ruelles oubliées, chemins non balisés.");
  }
  if (style.includes('luxe')) {
    blocs.push("Inclue des suggestions haut de gamme : ryokan de prestige, restaurants étoilés, expériences raffinées.");
  }

  // INTÉRÊTS
  if (interests.includes('gastronomie')) {
    blocs.push("Décris les spécialités régionales, les ambiances des lieux, et propose des expériences comme un cours de cuisine, un marché ou un dîner dans un izakaya.");
  }
  if (interests.includes('artisanat')) {
    blocs.push("Ajoute des ateliers traditionnels, visites de maîtres artisans, musées vivants du savoir-faire ou quartiers dédiés.");
  }
  if (interests.includes('spiritualité')) {
    blocs.push("Intègre des temps de silence, des lieux propices à la méditation, des temples reculés ou des cérémonies locales.");
  }
  if (interests.includes('manga')) {
    blocs.push("Propose des musées spécialisés, des quartiers pop comme Akihabara, des cafés à thème et des boutiques dédiées.");
  }
  if (interests.includes('nature')) {
    blocs.push("Mets en avant des balades, randonnées, onsen en extérieur, forêts sacrées ou bords de mer selon la saison.");
  }

  // RYTHME
  if (rythme === 'intense') {
    blocs.push("Optimise chaque journée avec des activités variées et peu de temps morts, tout en gardant du sens.");
  } else if (rythme === 'tranquille' || rythme === 'détendu') {
    blocs.push("Accorde de l’espace à la contemplation, au ressenti, avec des moments non programmés ou simplement suggestifs.");
  }

  // CONCLUSION
  if (data.conclusion === true || data.conclusion === 'oui') {
    blocs.push("Ajoute une conclusion poétique ou synthétique à la fin du voyage : récapitule les émotions, les souvenirs, les temps forts.");
  }

  return blocs.join('\n');
}

function generatePrompt(data) {
  const intro = data.mode === "complet"
    ? `Tu es un expert du Japon et tu rédiges un itinéraire personnalisé de ${data.duration} jours à partir du ${data.start}, avec un budget d’environ ${data.budget}€.
Le voyageur souhaite découvrir le Japon selon les critères suivants :
- Type de voyage : ${sanitizeInput(data.type)}
- Style : ${formatList(data.style)}
- Rythme : ${sanitizeInput(data.rythme)}
- Déjà allé au Japon ? ${sanitizeInput(data.deja)}
- Centres d’intérêt : ${formatList(data.interests)}
- Villes à inclure : ${sanitizeInput(data.villesSouhaitees)}
- Villes à éviter : ${sanitizeInput(data.lieuxAeviter)}
- Remarques spécifiques : ${sanitizeInput(data.remarques)}`
    : `Tu es un expert local qui crée un mini-itinéraire personnalisé à ${data.ville} pendant ${data.joursVille} jours (${data.periodeVille}).
Le voyageur cherche une expérience adaptée à :
- Type de voyage : ${sanitizeInput(data.type)}
- Style : ${formatList(data.style)}
- Rythme : ${sanitizeInput(data.rythme)}
- Centres d’intérêt : ${formatList(data.interests)}
- Remarques : ${sanitizeInput(data.remarques)}`;

  const enrichissements = enrichPrompt(data);

  const structure = `
Structure impérative :
- Rédige l’itinéraire dans un style fluide, immersif, presque comme un carnet de voyage ou un récit personnel.
- Utilise la 2e personne du pluriel ("vous") pour créer une connexion directe.
- Structure chaque journée avec un titre de niveau 2 : ## Jour X – titre descriptif (avec un emoji si possible)
- Structure chaque moment de la journée avec un sous-titre de niveau 3 : ### Matin, ### Midi, ### Après-midi, ### Soir (chacun peut être introduit par un emoji)
- Chaque moment doit être suivi de texte descriptif, vivant et culturel (par exemple : ce qu’on y fait, voit, ressent, comprend)
- Pour les moments "Midi" et "Soir", suggère un lieu de restauration typique ou adapté (restaurant local, izakaya, expérience culinaire…).
- Propose un lien si disponible au format 👉 [Voir le restaurant](https://...)
- Lorsque cela est pertinent, suggère un hébergement typique (ryokan, hôtel, guesthouse…) avec un court descriptif.
- Adapte le style d’hébergement au type de voyage (famille, couple, professionnel, luxe…).
- Fournis un lien utile si disponible au format 👉 [Voir l’hébergement](https://...)
- Ne propose le nom d’un hébergement que s’il correspond à un lieu réel et connu.
- Pour chaque lieu ou activité importante, ajoute une phrase de contexte (ce qu’on y découvre) suivie d’un lien réel vers une source fiable (Google Maps, Japan Guide, ou site officiel) au format 👉 [En savoir plus](https://exemple.com)
- Ne mets jamais de lien vide ou fictif (pas de https://...)
- S’il y a un événement de saison (sakura, momiji, festival...), fais-le apparaître naturellement
- Si la période du voyage coïncide avec un événement ou festival local (matsuri, feu d’artifice, floraison, marché d’hiver…), ajoute-le naturellement dans l’itinéraire.
- Donne son nom, le lieu, et en quoi il enrichit l’expérience (ambiance, culture, foule, rituels…).
- Ajoute un lien utile si possible au format 👉 [Voir l’événement](https://...)
- Mets en lumière une expérience unique ou peu connue chaque jour
- Pas de bullet points, pas de tableaux, pas de code
`;

  return `${intro}\n\n${enrichissements}\n\n${structure}`;
}

module.exports = { generatePrompt };
