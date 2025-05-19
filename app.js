require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const OpenAI = require("openai");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

app.post("/api/planificateur", async (req, res) => {
  const data = req.body;
  console.log("\u{1F4DD} Données reçues :", data);

  let prompt = "";

  if (data.mode === "complet") {
    prompt += `Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.\n`;
    prompt += `L'utilisateur s'appelle ${data.username}.\n`;
    prompt += `Il souhaite organiser un voyage complet au Japon à partir du ${data.start}, pour une durée de ${data.duration} jours avec un budget de ${data.budget} euros.\n`;
    if (data.lieuxAeviter) prompt += `Il souhaite éviter : ${data.lieuxAeviter}.\n`;
    if (data.villesSouhaitees) prompt += `Il souhaite inclure : ${data.villesSouhaitees}.\n`;
  } else {
    prompt += `Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${data.ville} pendant ${data.dureeVille} jours à la période suivante : ${data.periodeVille}.\n`;
  }

  if (data.type) prompt += `Type de voyage : ${data.type}.\n`;
  if (data.style) prompt += `Style souhaité : ${data.style}.\n`;
  if (data.rythme) prompt += `Rythme : ${data.rythme}.\n`;
  if (data.deja) prompt += `A-t-il déjà voyagé au Japon ? ${data.deja}.\n`;
  if (data.interests && data.interests.length > 0) prompt += `Centres d’intérêt : ${data.interests.join(", ")}.\n`;
  if (data.remarques) prompt += `Remarques particulières : ${data.remarques}.\n`;

  prompt += `\nPropose un itinéraire jour par jour ${data.mode === "ville" ? "dans cette ville" : "très personnalisé"} (lieux, activités, expériences culinaires, recommandations).\n`;

  if (data.mode === "ville") {
    prompt += `\n🍽️ Explorer les meilleures adresses à ${data.ville} :\n`;
    prompt += `- Ramen → https://tabelog.com/search?sk=ramen%20${data.ville}\n`;
    prompt += `- Sushi → https://tabelog.com/search?sk=sushi%20${data.ville}\n`;
    prompt += `- Izakaya → https://tabelog.com/search?sk=izakaya%20${data.ville}\n`;
    prompt += `- Street food → https://tabelog.com/search?sk=street%20food%20${data.ville}\n`;
    prompt += `- Michelin → https://tabelog.com/search?sk=michelin%20${data.ville}\n`;
  }

  prompt += `\nMerci d’intégrer quelques suggestions de restaurants dans l’itinéraire, avec un lien cliquable sous la forme : (plus d’info : URL).\n`;

  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      return res.status(500).json({ error: "Réponse vide." });
    }

    console.log("\u{1F4DE} Réponse reçue.");
    res.json({ result });
  } catch (error) {
    console.error("\u{274C} Erreur lors de la génération :", error);
    res.status(500).json({ error: "Erreur lors de la génération de l’itinéraire." });
  }
});

app.listen(10000, () => {
  console.log("✅ Serveur lancé sur http://localhost:10000");
});
