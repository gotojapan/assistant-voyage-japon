function genererBlocRecommandationKyoto(data, enrichissements) {
  const { interests = [], type = '' } = data;
  const lignes = [];

  lignes.push("### Notre recommandation pour enrichir votre séjour à Kyoto :");
  lignes.push("");
  lignes.push("Pour ce séjour à Kyoto, nous avons sélectionné quelques adresses emblématiques et inspirantes, en harmonie avec vos envies exprimées dans le formulaire.");

  if (interests.includes("temples")) {
    const temples = enrichissements.temples || [];
    if (temples.length > 0) {
      lignes.push(`Parmi les lieux spirituels les plus marquants, nous vous invitons à découvrir ${temples.map(t => `le [**${t.nom}**](${t.url})`).join(', ')}, chacun offrant une atmosphère unique, entre recueillement et contemplation.`);
    }
  }

  if (interests.includes("gastronomie")) {
    const restos = enrichissements.gastronomie || [];
    if (restos.length > 0) {
      lignes.push(`Côté saveurs, nous vous recommandons ${restos.map(r => `[**${r.nom}**](${r.url})`).join(' et ')}, deux établissements réputés pour leur interprétation raffinée de la cuisine de Kyoto, notamment le _shōjin ryōri_, la cuisine monastique végétarienne.`);
    }
  }

  if (interests.includes("spiritualité")) {
    lignes.push("Pour enrichir cette immersion, pensez aussi à vivre une cérémonie du thé ou à vous offrir un moment de silence dans un jardin zen, à l’abri des foules.");
  }

  if (interests.includes("artisanat")) {
    lignes.push("Kyoto est aussi un haut lieu de l’artisanat japonais. Vous pourriez visiter un atelier de poterie ou de laque urushi, ou rencontrer un artisan textile perpétuant les savoir-faire anciens.");
  }

  if (interests.includes("nature")) {
    lignes.push("Si vous aimez la nature, une balade sur le chemin des philosophes ou le long de la rivière Kamo vous offrira un bol d’air apaisant, surtout au lever du soleil ou au moment où les érables rougissent.");
  }

  if (interests.includes("manga")) {
    lignes.push("Et pour les amateurs de culture pop, Kyoto propose aussi des boutiques spécialisées, des expositions temporaires ou des cafés à thème, notamment dans le quartier de Teramachi.");
  }

  if (type === "couple") {
    lignes.push("Enfin, pour les soirées, nous suggérons un ryokan raffiné comme le [**Tawaraya Ryokan**](http://www.tawaraya-kyoto.jp/) : ambiance feutrée, bains privés et service exceptionnel en feront une parenthèse romantique parfaite.");
  } else if (type === "famille") {
    lignes.push("En famille, pensez à loger dans un ryokan confortable avec bains intérieurs et repas adaptés aux enfants, ou à intégrer un atelier ludique (calligraphie, cuisine, kimono...).");
  }

  lignes.push("");
  return lignes.join("\n");
}
