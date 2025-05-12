
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
Tu es un assistant de voyage spécialisé au Japon. Voici les infos fournies :

- Départ : \${start}
- Durée : \${duration} jours
- Budget : \${budget} €
- Centres d’intérêt : \${interests.join(', ')}

Propose un itinéraire jour par jour, adapté à ces critères.
    `;

    const completion = await openai.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ result: "Erreur lors de la génération de l'itinéraire." });
  }
});

app.listen(3000, () => {
  console.log('✅ Serveur lancé sur http://localhost:3000');
});
