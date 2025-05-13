
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const configuration = new Configuration({
  apiKey: process.env.OPENROUTER_API_KEY,
  basePath: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://gotojapan.fr',
    'X-Title': 'Assistant Voyage Japon'
  }
});
const openai = new OpenAIApi(configuration);

function getEvenements(region) {
  try {
    const filepath = path.join(__dirname, 'data', `events_${region}.txt`);
    if (fs.existsSync(filepath)) {
      const contenu = fs.readFileSync(filepath, 'utf-8');
      return contenu.split('\n').slice(0, 5).join('\n');
    }
  } catch (e) {
    console.error("Erreur lecture événements :", e);
  }
  return '';
}

function getRestaurants(ville) {
  try {
    const filepath = path.join(__dirname, 'data', `restaurants_${ville.toLowerCase()}.txt`);
    if (fs.existsSync(filepath)) {
      const contenu = fs.readFileSync(filepath, 'utf-8');
      return contenu.split('\n').slice(0, 3).join('\n');
    }
  } catch (e) {
    console.error("Erreur lecture restaurants :", e);
  }
  return '';
}

function construirePrompt(data) {
  const { mode, username, start, duration, budget, interests = [], villesSouhaitees = '', lieuxAeviter = '', type = '', style = '', rythme = '', ville, periodeVille, joursVille } = data;

  let prompt = "Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.";

  if (mode === "complet") {
    prompt += ` Voici les préférences de ${username} :
- 🗓 Date de départ : ${start}
- ⏱ Durée : ${duration} jours
- 💶 Budget : ${budget} €
- 🎯 Centres d’intérêt : ${interests.join(', ')}
- 🧭 Villes/régions souhaitées : ${villesSouhaitees}
- 🚫 Lieux à éviter : ${lieuxAeviter}
- 👥 Type de voyageur : ${type}
- 🧳 Style de voyage : ${style}
- 🔄 Rythme : ${rythme}

`;

    const regions = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu_okinawa'];
    for (const reg of regions) {
      if (villesSouhaitees.toLowerCase().includes(reg)) {
        const evts = getEvenements(reg);
        if (evts) {
          prompt += `📅 Événements dans la région ${reg} :\n${evts}\n\n`;
        }
      }
    }

    prompt += `Propose un itinéraire détaillé, jour par jour, avec des suggestions d'activités, de lieux, de restaurants et de spécialités locales.`;

  } else if (mode === "ville") {
    prompt += ` L'utilisateur souhaite explorer la ville de ${ville} pendant ${joursVille} jours à la période suivante : ${periodeVille}.
Ses centres d’intérêt sont : ${interests.join(', ')}.`;

    const villes = {
      kyoto: 'kinki',
      osaka: 'kinki',
      nara: 'kinki',
      tokyo: 'kanto',
      sapporo: 'hokkaido',
      fukuoka: 'kyushu_okinawa',
      hiroshima: 'chugoku',
      kanazawa: 'chubu'
    };
    const reg = villes[ville.toLowerCase()];
    if (reg) {
      const evts = getEvenements(reg);
      if (evts) {
        prompt += `\n📅 Événements à cette période dans la région de ${reg} :\n${evts}\n`;
      }
    }

    const restos = getRestaurants(ville);
    if (restos) {
      prompt += `\n🍽️ Suggestions de restaurants à ${ville} :\n${restos}\n`;
    }

    prompt += `\nPropose un programme jour par jour, en intégrant lieux, activités, spécialités culinaires et une logique de saison.`;
  }

  return prompt;
}

app.post('/api/planificateur', async (req, res) => {
  try {
    const prompt = construirePrompt(req.body);
    const completion = await openai.createChatCompletion({
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });
    res.json({ result: completion.data.choices[0].message.content });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Erreur lors de la génération.' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Serveur lancé sur http://localhost:3000');
});
