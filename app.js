
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const OpenAI = require("openai");
const PDFDocument = require("pdfkit");
const fs = require("fs");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

app.post("/api/planificateur", async (req, res) => {
  try {
    const {
      username,
      start,
      duration,
      budget,
      villesSouhaitees,
      lieuxAeviter,
      type,
      style,
      rythme,
      deja,
      interests,
      remarques,
      mode,
      ville,
      periodeVille,
      joursVille,
    } = req.body;

    let prompt = "";
    if (mode === "complet") {
      prompt += `Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.
`;
      prompt += `L'utilisateur s'appelle ${username}.
`;
      prompt += `Il souhaite organiser un voyage complet au Japon à partir du ${start}, pour une durée de ${duration} jours avec un budget de ${budget} euros.

`;
      if (villesSouhaitees) prompt += `Il souhaite visiter : ${villesSouhaitees}.
`;
      if (lieuxAeviter) prompt += `Il souhaite éviter : ${lieuxAeviter}.
`;
      if (type) prompt += `Type de voyage : ${type}.
`;
      if (style) prompt += `Style de voyage souhaité : ${style}.
`;
      if (rythme) prompt += `Rythme de voyage : ${rythme}.
`;
      if (deja) prompt += `A-t-il déjà voyagé au Japon ? ${deja}.
`;
      if (interests?.length) prompt += `Centres d’intérêt : ${interests.join(", ")}.
`;
      if (remarques) prompt += `Remarques : ${remarques}.
`;
      prompt += `
Propose un itinéraire jour par jour très personnalisé (lieux, activités, expériences culinaires, recommandations).
`;
      if (villesSouhaitees) {
        const ville = villesSouhaitees.split(",")[0].trim().toLowerCase();
        prompt += `
🍽️ Explorer les meilleures adresses à ${ville} :
`;
        prompt += `- Ramen → https://tabelog.com/search?sk=ramen%20${ville}
`;
        prompt += `- Sushi → https://tabelog.com/search?sk=sushi%20${ville}
`;
        prompt += `- Izakaya → https://tabelog.com/search?sk=izakaya%20${ville}
`;
        prompt += `- Street food → https://tabelog.com/search?sk=street%20food%20${ville}
`;
        prompt += `- Michelin → https://tabelog.com/search?sk=michelin%20${ville}

`;
        prompt += `Merci d’intégrer quelques suggestions de restaurants dans l’itinéraire.
`;
      }
    } else if (mode === "ville") {
      prompt += `Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${ville} pendant ${joursVille} jours à la période suivante : ${periodeVille}.
`;
      if (type) prompt += `Type de voyage : ${type}.
`;
      if (style) prompt += `Style souhaité : ${style}.
`;
      if (rythme) prompt += `Rythme : ${rythme}.
`;
      if (deja) prompt += `Déjà voyagé au Japon ? ${deja}.
`;
      if (interests?.length) prompt += `Centres d’intérêt : ${interests.join(", ")}.
`;
      if (remarques) prompt += `Remarques : ${remarques}.
`;
      prompt += `
Propose un itinéraire jour par jour dans cette ville, avec suggestions précises (lieux, quartiers, restaurants, événements).
`;

      const v = ville.toLowerCase();
      prompt += `
🍽️ Explorer les meilleures adresses à ${v} :
`;
      prompt += `- Ramen → https://tabelog.com/search?sk=ramen%20${v}
`;
      prompt += `- Sushi → https://tabelog.com/search?sk=sushi%20${v}
`;
      prompt += `- Izakaya → https://tabelog.com/search?sk=izakaya%20${v}
`;
      prompt += `- Street food → https://tabelog.com/search?sk=street%20food%20${v}
`;
      prompt += `- Michelin → https://tabelog.com/search?sk=michelin%20${v}

`;
      prompt += `Merci d’intégrer quelques suggestions de restaurants dans l’itinéraire.
`;
    }

    console.log(`📤 Prompt envoyé à OpenRouter :
${prompt}`);

    const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" });

    const completion = await openai.chat.completions.create({
      model: "openrouter/gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const result = completion.choices?.[0]?.message?.content;
    if (!result) throw new Error("Aucune réponse valide");

    res.json({ result });
  } catch (error) {
    console.error("❌ Erreur lors de la génération :", error);
    res.status(500).json({ error: "Une erreur est survenue." });
  }
});

app.listen(port, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${port}`);
});
