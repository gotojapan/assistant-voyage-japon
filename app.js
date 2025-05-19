// app.js complet et corrigé pour assistant de voyage au Japon

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const OpenAI = require('openai');

// Configuration
dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

// Endpoint principal
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
      joursVille
    } = req.body;

    let prompt = '';

    if (mode === 'ville') {
      prompt += `Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${ville} pendant ${joursVille} jours à la période suivante : ${periodeVille}.\n`;
      if (type) prompt += `Type de voyage : ${type}.\n`;
      if (style) prompt += `Style souhaité : ${style}.\n`;
      if (rythme) prompt += `Rythme : ${rythme}.\n`;
      if (deja) prompt += `Déjà voyagé au Japon ? ${deja}.\n`;
      if (interests?.length) prompt += `Centres d’intérêt : ${interests.join(', ')}.\n`;
    } else {
      prompt += `Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.\n`;
      prompt += `L'utilisateur s'appelle ${username}.\n`;
      prompt += `Il souhaite organiser un voyage complet au Japon à partir du ${start}, pour une durée de ${duration} jours avec un budget de ${budget} euros.\n\n`;
      if (villesSouhaitees) prompt += `Il souhaite visiter : ${villesSouhaitees}.\n`;
      if (lieuxAeviter) prompt += `Il souhaite éviter : ${lieuxAeviter}.\n`;
      if (type) prompt += `Type de voyage : ${type}.\n`;
      if (style) prompt += `Style de voyage souhaité : ${style}.\n`;
      if (rythme) prompt += `Rythme de voyage : ${rythme}.\n`;
      if (deja) prompt += `A-t-il déjà voyagé au Japon ? ${deja}.\n`;
      if (interests?.length) prompt += `Centres d’intérêt : ${interests.join(', ')}.\n`;
    }

    if (interests?.includes("gastronomie")) {
      const city = mode === 'ville' ? ville.toLowerCase() : 'tokyo';
      prompt += `\n🍽️ Explorer les meilleures adresses à ${city} :\n`;
      prompt += `- Ramen → https://tabelog.com/search?sk=ramen%20${city}\n`;
      prompt += `- Sushi → https://tabelog.com/search?sk=sushi%20${city}\n`;
      prompt += `- Izakaya → https://tabelog.com/search?sk=izakaya%20${city}\n`;
      prompt += `- Street food → https://tabelog.com/search?sk=street%20food%20${city}\n`;
      prompt += `- Michelin → https://tabelog.com/search?sk=michelin%20${city}\n`;
      prompt += `\nMerci d’intégrer quelques suggestions de restaurants dans l’itinéraire.\n`;
    }

    if (remarques) {
      prompt += `\n⚠️ Remarques supplémentaires : ${remarques}.\n`;
    }

    prompt += `\nPropose un itinéraire jour par jour ${mode === 'ville' ? 'dans cette ville' : 'très personnalisé'} (lieux, activités, expériences culinaires, recommandations).`;

    console.log("📤 Prompt envoyé à OpenRouter :\n", prompt);

    const completion = await openai.chat.completions.create({
      model: "mistralai/mixtral-8x7b",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const result = completion.choices?.[0]?.message?.content;
    if (!result) {
      console.log("❌ Réponse vide :", completion);
      return res.status(500).json({ error: "Réponse vide de la part du modèle." });
    }

    console.log("✅ Réponse reçue.");
    res.json({ result });

  } catch (err) {
    console.error("❌ Erreur lors de la génération :", err);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});

// Génération du PDF
app.post("/api/pdf", async (req, res) => {
  try {
    const { texte } = req.body;
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

app.listen(process.env.PORT || 10000, () => {
  console.log("✅ Serveur lancé sur http://localhost:10000");
});
