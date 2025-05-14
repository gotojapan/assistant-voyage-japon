
const express = require('express');
const fs = require('fs');
require('dotenv').config();
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://gotojapan.fr',
    'X-Title': 'Assistant Voyage Japon'
  }
});

async function construirePrompt(data) {
  console.log('🔍 Début de génération du prompt');
  const { mode, username, start, duration, budget, interests = [], villesSouhaitees = '', lieuxAeviter = '', type = '', style = '', rythme = '', ville, periodeVille, joursVille } = data;

  let prompt = "Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.";

  if (mode === "ville") {
    prompt += ` L'utilisateur souhaite explorer la ville de ${ville} pendant ${joursVille} jours à la période suivante : ${periodeVille}.
Ses centres d’intérêt sont : ${interests.join(', ')}.`;

    const categories = ['ramen', 'sushi', 'izakaya', 'street food', 'michelin'];
    const formattedLinks = categories.map(cat => {
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      const url = `https://tabelog.com/search?sk=${encodeURIComponent(cat + ' ' + ville)}`;
      return `- ${label} → ${url}`;
    }).join('\n');

    prompt += `\n🍽️ Explorer les meilleures adresses à ${ville} :\n${formattedLinks}\n`;

    prompt += `\nPropose un programme jour par jour, en intégrant lieux, activités, spécialités culinaires et une logique de saison.`;
  }

  return prompt;
}

app.post('/api/planificateur', async (req, res) => {
  try {
    const prompt = await construirePrompt(req.body);
    console.log('📤 Prompt envoyé à OpenAI :\n', prompt);
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    res.json({ result: completion.choices[0].message.content });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Erreur lors de la génération.' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Serveur lancé sur http://localhost:3000');
});
