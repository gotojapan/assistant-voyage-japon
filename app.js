
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
    const formattedBlocks = categories.map(cat => {
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      const searchUrl = `https://tabelog.com/search?sk=${encodeURIComponent(cat + ' ' + ville)}`;
      return `\n🍽️ ${label} à ${ville} :\n- Indique 2 à 3 restaurants réputés pour ${cat} à ${ville} avec nom et quartier.\n🔗 Voir plus sur Tabelog : ${searchUrl}`;
    }).join('\n');

    prompt += `\n${formattedBlocks}\n\nPropose un programme jour par jour, en intégrant lieux, activités, spécialités culinaires, et recommande aussi ces restaurants en les intégrant dans l’itinéraire généré.`;
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
