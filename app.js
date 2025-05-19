
// app.js corrigé et fonctionnel

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const OpenAI = require('openai');

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

app.post("/api/planificateur", async (req, res) => {
  try {
    const {
      username, start, duration, budget, villesSouhaitees, lieuxAeviter,
      type, style, rythme, deja, interests, remarques,
      mode, ville, periodeVille, joursVille
    } = req.body;

    let prompt = '';

    if (mode === 'ville') {
      prompt += `Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${ville} pendant ${joursVille} jours à la période suivante : ${periodeVille}.
`;
    } else {
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
    }

    if (type) prompt += `Type de voyage : ${type}.
`;
    if (style) prompt += `Style de voyage souhaité : ${style}.
`;
    if (rythme) prompt += `Rythme de voyage : ${rythme}.
`;
    if (deja) prompt += `A-t-il déjà voyagé au Japon ? ${deja}.
`;
    if (interests?.length) prompt += `Centres d’intérêt : ${interests.join(', ')}.
`;
    if (interests?.includes("gastronomie")) {
      const city = mode === 'ville' ? ville.toLowerCase() : 'tokyo';
      prompt += `
🍽️ Explorer les meilleures adresses à ${city} :
`;
      prompt += `- Ramen → [plus d'infos](https://tabelog.com/search?sk=ramen%20${city})
`;
      prompt += `- Sushi → [plus d'infos](https://tabelog.com/search?sk=sushi%20${city})
`;
      prompt += `- Izakaya → [plus d'infos](https://tabelog.com/search?sk=izakaya%20${city})
`;
      prompt += `- Street food → [plus d'infos](https://tabelog.com/search?sk=street%20food%20${city})
`;
      prompt += `- Michelin → [plus d'infos](https://tabelog.com/search?sk=michelin%20${city})
`;
    }

    if (remarques) {
      prompt += `
⚠️ Remarques supplémentaires : ${remarques}.
`;
    }

    prompt += `
Propose un itinéraire jour par jour ${mode === 'ville' ? 'dans cette ville' : 'très personnalisé'} (lieux, activités, expériences culinaires, recommandations).
`;

    const completion = await openai.chat.completions.create({
      model: "mistralai/mixtral-8x7b",
      messages: [{ role: "user", content: prompt }]
    });

    const result = completion.choices?.[0]?.message?.content;
    if (!result) return res.status(500).json({ error: "Réponse vide du modèle" });

    res.json({ result });

  } catch (err) {
    console.error("Erreur :", err);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});

app.post("/api/pdf", async (req, res) => {
  try {
    const { texte } = req.body;
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    const filename = "itineraire-japon.pdf";
    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);
    doc.font('Times-Roman').fontSize(12).text(texte, { align: 'left' });
    doc.end();
  } catch (e) {
    console.error("Erreur PDF :", e);
    res.status(500).send("Erreur PDF");
  }
});

app.listen(process.env.PORT || 10000, '0.0.0.0', () => {
  console.log("✅ Serveur lancé sur http://localhost:10000");
});
