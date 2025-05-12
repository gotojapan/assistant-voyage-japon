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
Tu es un expert en voyages au Japon, spécialisé dans les itinéraires personnalisés de grande qualité. Tu t’adresses à un voyageur francophone qui attend un conseil haut de gamme, structuré, clair et inspirant.

Voici les informations fournies par le voyageur :

- 🗓 Date de départ : ${start}
- ⏱ Durée du séjour : ${duration} jours
- 💶 Budget approximatif : ${budget} €
- 🎯 Centres d’intérêt : ${interests.join(', ')}

Ta mission est de proposer un **itinéraire détaillé jour par jour**, structuré ainsi :

📍 **Ville principale du jour**  
🕗 **Matin** : activité, visite ou expérience  
🕑 **Après-midi** : découverte locale ou moment libre  
🌙 **Soir** : suggestion de dîner ou quartier à explorer  
🏨 **Hébergement recommandé** (niveau cohérent avec le budget : capsule, ryokan, business hôtel, hôtel design…)

🚄 Si changement de ville, indique le mode de transport et la durée estimée (ex. : "Train JR Tokyo → Kanazawa – 2h30")

🍱 Chaque jour, propose aussi une **spécialité culinaire locale** à tester (avec contexte culturel ou anecdote si possible)

🧘‍♀️ Tu peux ajouter une touche de spiritualité, nature ou culture pop selon les centres d’intérêt.

📝 Sois fluide, humain, et évocateur. Ne fais jamais de liste sèche. Ne réutilise pas les variables brutes comme \${duration} ou \${budget}.

Commence par un **résumé personnalisé du voyage**, puis déroule chaque jour clairement.

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
