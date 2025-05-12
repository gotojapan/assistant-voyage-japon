
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
    "HTTP-Referer": "https://assistant-japon.onrender.com",
    "X-Title": "assistant-voyage-japon"
  }
});

app.post('/api/planificateur', async (req, res) => {
  try {
    const { start, duration, budget, interests } = req.body;

    const prompt = `
Tu es un expert en voyages sur mesure au Japon, spécialisé dans l'élaboration d’itinéraires personnalisés pour les visiteurs francophones.

Voici les préférences du voyageur :

- 🗓 Date de départ : ${start}
- ⏱ Durée du séjour : ${duration} jours
- 💶 Budget approximatif : ${budget} €
- 🎯 Centres d’intérêt : ${interests.join(', ')}

Ta mission est de proposer un **itinéraire détaillé jour par jour** :
- Commence chaque jour par **le lieu ou la ville principale**
- Indique des **activités typiques**, **moments de découverte locale**, et **pauses détente**
- Mentionne parfois un **plat à goûter** ou une **expérience originale**
- Varie les rythmes pour éviter la fatigue
- Termine par une suggestion **d’hébergement réaliste** dans la zone

Utilise un ton clair, humain, et passionné. Sois utile et évocatif sans faire de listes sèches.
`;

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ result: "Erreur lors de la génération de l'itinéraire." });
  }
});

app.listen(3000, () => {
  console.log('✅ Serveur lancé sur http://localhost:3000');
});
