const { enrichirJournee } = require('./enrichissement_kyoto.js');

function formatList(item) {
  if (!item) return 'Non précisé';
  let arr = [];

  if (typeof item === 'string') {
    arr = item.split(',').map(e => e.trim().toLowerCase());
  } else if (Array.isArray(item)) {
    arr = item.map(e => e.trim().toLowerCase());
  }

  const unique = [...new Set(arr)].filter(e => e && e.length > 1);
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

  if (data.ton === 'chaleureux') {
    blocs.push("Utilise un ton chaleureux, humain, complice, comme un ami qui partage ses bons plans avec enthousiasme.");
  } else if (data.ton === 'professionnel') {
    blocs.push("Adopte un style clair, structuré et synthétique, avec un vocabulaire précis mais accessible.");
  } else if (data.ton === 'inspirationnel') {
    blocs.push("Crée une ambiance immersive : évoque les sensations, les parfums, les sons, les couleurs du Japon à chaque moment.");
  }

  if (type === 'couple') blocs.push("Ajoute des moments romantiques : vues panoramiques, onsen en soirée, balades calmes au coucher du soleil.");
  if (type === 'famille') blocs.push("Privilégie les lieux adaptés aux enfants : musées ludiques, parcs animaliers, pauses régulières, logements pratiques.");
  if (type === 'amis') blocs.push("Propose des lieux vivants ou conviviaux : izakaya, quartiers animés, activités collectives, expériences à partager.");

  if (style.includes('authentique')) blocs.push("Privilégie les expériences locales, traditionnelles ou peu touristiques, avec une rencontre humaine ou culturelle.");
  if (style.includes('hors des sentiers battus')) blocs.push("Propose des endroits méconnus ou insolites : villages reculés, ruelles oubliées, chemins non balisés.");
  if (style.includes('luxe')) blocs.push("Inclue des suggestions haut de gamme : ryokan de prestige, restaurants étoilés, expériences raffinées.");

  if (interests.includes('gastronomie')) blocs.push("Décris les spécialités régionales, les ambiances des lieux, et propose des expériences comme un cours de cuisine, un marché ou un dîner dans un izakaya.");
  if (interests.includes('artisanat')) blocs.push("Ajoute des ateliers traditionnels, visites de maîtres artisans, musées vivants du savoir-faire ou quartiers dédiés.");
  if (interests.includes('spiritualité')) blocs.push("Intègre des temps de silence, des lieux propices à la méditation, des temples reculés ou des cérémonies locales.");
  if (interests.includes('manga')) blocs.push("Propose des musées spécialisés, des quartiers pop comme Akihabara, des cafés à thème et des boutiques dédiées.");
  if (interests.includes('nature')) blocs.push("Mets en avant des balades, randonnées, onsen en extérieur, forêts sacrées ou bords de mer selon la saison.");

  if (rythme === 'intense') blocs.push("Optimise chaque journée avec des activités variées et peu de temps morts, tout en gardant du sens.");
  else if (rythme === 'tranquille' || rythme === 'détendu') blocs.push("Accorde de l’espace à la contemplation, au ressenti, avec des moments non programmés ou simplement suggestifs.");

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
  let enrichissementVille = '';

  if (data.ville?.toLowerCase() === "kyoto") {
    console.log("🚀 ENRICHISSEMENT KYOTO ACTIVÉ !");
    const interets = Array.isArray(data.interests) ? data.interests.map(e => e.toLowerCase()) : [];
    const enrichissementsDynamiques = enrichirJournee("Kyoto", interets);
    console.log("📊 Résultat enrichirJournee :", enrichissementsDynamiques);

    if (
      enrichissementsDynamiques &&
      (enrichissementsDynamiques.temples.length > 0 ||
        enrichissementsDynamiques.gastronomie.length > 0 ||
        enrichissementsDynamiques.lieux.length > 0 ||
        enrichissementsDynamiques.hebergements.length > 0)
    ) {
      const lignes = [];

      if (enrichissementsDynamiques.temples[0]) {
        const t = enrichissementsDynamiques.temples[0];
        lignes.push(`Commencez votre parcours par un moment d’introspection au temple ${t.nom}, ${t.description?.toLowerCase() || "un lieu chargé de spiritualité."}`);
      }

      if (enrichissementsDynamiques.gastronomie[0]) {
        const r = enrichissementsDynamiques.gastronomie[0];
        lignes.push(`À midi, laissez-vous tenter par ${r.nom}, une adresse réputée pour sa spécialité : ${r.spécialité?.join(', ') || "une cuisine locale raffinée"}.`);
      }

      if (enrichissementsDynamiques.lieux[0]) {
        const l = enrichissementsDynamiques.lieux[0];
        lignes.push(`L’après-midi, explorez ${l.nom_japonais || "un lieu culturel d’exception"}, propice à la contemplation et à la découverte.`);
      }

      if (enrichissementsDynamiques.hebergements[0]) {
        const h = enrichissementsDynamiques.hebergements[0];
        lignes.push(`Pour la nuit, profitez du confort de ${h.name || h.nom}, un hébergement typique à Kyoto où règne l’élégance japonaise.`);
      }

      enrichissementVille = `
<div class="bloc-recommandation">
<p><strong>🌟 Notre recommandation pour enrichir votre séjour :</strong></p>
<ul>
  <li>⛩️ ${lignes[0]}</li>
  <li>🍽️ ${lignes[1]}</li>
  <li>🎐 ${lignes[2]}</li>
  <li>🛌 ${lignes[3]}</li>
</ul>
</div>
`;
    }
  }

  let structure = `
Structure impérative :
- Rédige l’itinéraire dans un style fluide, immersif, presque comme un carnet de voyage ou un récit personnel.
- Utilise la 2e personne du pluriel ("vous") pour créer une connexion directe.
- Structure chaque journée avec un titre de niveau 2 : ## Jour X – titre descriptif (avec un emoji si possible).
- Structure chaque moment de la journée avec un sous-titre de niveau 3 : ### Matin, ### Midi, ### Après-midi, ### Soir (chacun peut être introduit par un emoji).
- Chaque moment doit être suivi d’un texte vivant et culturel (ce qu’on y fait, voit, ressent, comprend).
- Pour chaque lieu, activité, hébergement ou restaurant, ajoute impérativement un lien réel au format 👉 [En savoir plus](https://...).
- Ces liens sont essentiels pour guider le voyageur : ne les supprime jamais.
- Utilise des sources fiables (Japan Guide, Google Maps, site officiel). Si aucun lien n’est disponible, ne cite pas le lieu.
- Ne propose jamais d’éléments sous forme de bullet points, de tableaux ou de listes à puces.`;

  if (enrichissementVille) {
    structure += `\nIMPORTANT : reprends impérativement le paragraphe ci-dessus intitulé \"Notre recommandation pour enrichir votre séjour à Kyoto\" tel quel, et place-le en introduction du texte généré.`;
  }

  console.log("🧠 Prompt avec enrichissement :", `${intro}\n\n${enrichissements}\n\n${enrichissementVille}\n\n${structure}`);
  return `${intro}\n\n${enrichissements}\n\n${enrichissementVille}\n\n${structure}`;
}

module.exports = { generatePrompt };
