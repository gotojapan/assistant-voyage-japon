
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
  const {
    username, mode, start, duration, budget, interests = [],
    type, style, rythme, villesSouhaitees, lieuxAeviter, firstTime,
    ville, joursVille
  } = req.body;
  console.log("📦 Données reçues :", req.body);

  let prompt = "";

  if (mode === "ville") {
    prompt = `
Tu es un expert francophone du Japon. Voici une demande d'un utilisateur souhaitant explorer une ville spécifique au Japon.

Ville demandée : ${ville}
Durée sur place : ${joursVille} jours
Centres d’intérêt : ${interests.join(', ')}

Ta mission :
- Proposer un guide détaillé pour découvrir cette ville jour par jour
- Intégrer des suggestions d’activités (matin / après-midi / soir)
- Proposer un plat typique par jour (nom, description)
- Recommander un type d’hébergement local par nuit (ex. ryokan, capsule…)
- Indiquer les quartiers incontournables, les spécificités culturelles et les ambiances à vivre

Tu peux ajouter des anecdotes, conseils pratiques, événements saisonniers, etc.

Sois fluide, précis, inspirant. Commence par une brève présentation de la ville. Rédige en français naturel et agréable.
    `;
  } else {
    prompt = `
Tu es un expert francophone en voyages au Japon. Tu aides un voyageur à organiser un séjour sur mesure, complet et riche.

Voici les informations fournies :

Nom : ${username || "Voyageur"}
Date de départ : ${start}
Durée : ${duration} jours
Budget : ${budget} €
Centres d’intérêt : ${interests.join(', ')}
Type de voyageur : ${type}
Style de voyage préféré : ${style}
Rythme souhaité : ${rythme}
Souhaits particuliers : inclure ${villesSouhaitees || "aucune indication"}
Éviter : ${lieuxAeviter || "non précisé"}
Est-ce son premier voyage ? ${firstTime === 'oui' ? "Oui" : "Non"}

Consignes :

Propose un itinéraire complet, jour par jour, structuré comme suit :

📍 Ville principale du jour  
🕗 Matin : activité ou lieu  
🕑 Après-midi : découverte ou temps libre  
🌙 Soir : ambiance ou suggestion locale  
🍱 Plat typique ou spécialité à goûter  
🏨 Hébergement suggéré (adapté au budget)  
🚄 Trajet inter-ville (si besoin, avec durée estimée)

Commence par un court résumé du voyage. Utilise un ton fluide, humain, inspirant. Aide ce voyageur à vivre un moment inoubliable.
    `;
  }

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
    console.error("❌ Erreur :", error.message);
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
