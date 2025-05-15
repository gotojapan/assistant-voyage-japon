
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/planificateur', async (req, res) => {
  try {
    const data = req.body;
    console.log("🔍 Requête reçue avec données :", data);

    let prompt = "";

    if (data.mode === "complet") {
      prompt = `
Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.
L'utilisateur s'appelle ${data.username || "le voyageur"}.
Il souhaite organiser un voyage complet au Japon à partir du ${data.start}, pour une durée de ${data.duration} jours avec un budget de ${data.budget} euros.
${data.villesSouhaitees ? `Il souhaite inclure les villes suivantes : ${data.villesSouhaitees}.` : ""}
${data.lieuxAeviter ? `Il souhaite éviter : ${data.lieuxAeviter}.` : ""}
${data.type ? `Type de voyage : ${data.type}.` : ""}
${data.style ? `Style de voyage souhaité : ${Array.isArray(data.style) ? data.style.join(', ') : data.style}.` : ""}
${data.rythme ? `Rythme de voyage : ${data.rythme}.` : ""}
${data.deja ? `A-t-il déjà voyagé au Japon ? ${data.deja}.` : ""}
${data.interests ? `Centres d’intérêt : ${Array.isArray(data.interests) ? data.interests.join(', ') : data.interests}.` : ""}

Propose un itinéraire jour par jour très personnalisé (lieux, activités, expériences culinaires, recommandations).
      `;
    }

    else if (data.mode === "ville") {
      prompt = `
Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours à la période suivante : ${data.periodeVille}.
${data.type ? `Type de voyage : ${data.type}.` : ""}
${data.style ? `Style souhaité : ${Array.isArray(data.style) ? data.style.join(', ') : data.style}.` : ""}
${data.rythme ? `Rythme : ${data.rythme}.` : ""}
${data.interests ? `Centres d’intérêt : ${Array.isArray(data.interests) ? data.interests.join(', ') : data.interests}.` : ""}

Propose un itinéraire jour par jour dans cette ville, avec suggestions précises (lieux, quartiers, restaurants, événements).
      `;
    }

    console.log("📤 Prompt envoyé à OpenRouter :\n", prompt);

    const completion = await openai.chat.completions.create({
      model: 'openrouter/openai/gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    console.log("✅ Réponse reçue.");

    res.json({ result: response });
  } catch (error) {
    console.error("❌ Erreur lors de la génération :", error.message);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur lancé sur http://localhost:${PORT}`));
