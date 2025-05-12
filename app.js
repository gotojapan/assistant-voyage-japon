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
Tu es un expert du Japon. Tu conçois des voyages sur mesure, riches, authentiques et inspirants pour des voyageurs francophones exigeants.

Voici les informations de base fournies :

- 🗓 Date de départ : ${start}
- ⏱ Durée : ${duration} jours
- 💶 Budget : ${budget} €
- 🎯 Centres d’intérêt : ${interests.join(', ')}

Ta mission :

📝 Rédige un **itinéraire jour par jour** structuré comme suit :

---

📍 **Ville principale du jour**  
🕗 **Matin** : activité / visite / ambiance  
🕑 **Après-midi** : découverte / balade / moment libre  
🌙 **Soir** : ambiance ou quartier recommandé  
🍱 **Spécialité culinaire locale** : propose chaque jour un plat ou aliment typique (nom en français + petit contexte culturel ou anecdote)

🏨 **Hébergement suggéré** : propose chaque jour un type d’hébergement réaliste (capsule, ryokan, business hôtel, hôtel design...) cohérent avec le budget. Tu peux inventer des noms typiques japonais (ex. : Ryokan Matsunoya, Guesthouse Shiba...).

🚄 Si changement de ville : indique le **mode de transport et durée estimée** (train, bus, ferry...), en précisant si c’est inclus dans le JR Pass

---

✅ Sois fluide, vivant, humain. Pas de listes sèches. Évite tout ce qui ressemble à \${...}.  
Commence par un **résumé personnalisé du voyage**, puis déroule chaque jour avec soin.

Ta réponse doit donner envie de partir immédiatement.
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
