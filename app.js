const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    "HTTP-Referer": "https://assistant-voyage-japon.onrender.com",
    "X-Title": "assistant-voyage-japon"
  }
});

app.post('/api/planificateur', async (req, res) => {
  console.log("🔔 Requête reçue !");
  const { start, duration, budget, interests } = req.body;
  console.log("📦 Données reçues :", req.body);

  const prompt = `
Tu es un expert en voyages sur mesure au Japon.

Voici les données utilisateur à intégrer directement dans ta réponse (pas de \${...}, pas de variables) :

- 🗓 Date de départ : ${start}
- ⏱ Durée du séjour : ${duration} jours
- 💶 Budget : ${budget} €
- 🎯 Centres d’intérêt : ${interests.join(', ')}

Ta mission est de créer un **itinéraire détaillé jour par jour** adapté à ce voyageur :

- Chaque jour commence par le lieu ou la ville principale
- Inclue des activités pertinentes, des conseils de visite, des idées repas ou expériences uniques
- Garde un ton clair, fluide, et humain
- Évite absolument toute répétition de variable non interprétée (ex. : "\${duration}")
- Parle comme un conseiller humain

Commence dès la première ligne par un résumé personnalisé intégrant toutes les données ci-dessus.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const result = completion.choices[0].message.content;
    console.log("✅ Réponse IA générée");
    res.json({ result });

  } catch (error) {
    console.error("❌ Erreur lors de la génération :", error.message);
    if (error.response) {
      console.error("💥 Réponse brute :", error.response.data);
    }
    res.status(500).json({ result: "Erreur lors de la génération de l'itinéraire." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${port}`);
});
