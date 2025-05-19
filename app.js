
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/planificateur', async (req, res) => {
  try {
    const data = req.body;
    console.log("🔍 Requête reçue avec données :", data);

    let prompt = "";
    let tabelogBlock = "";

    const includesGastronomie = data.interests && (
      (Array.isArray(data.interests) && data.interests.includes("gastronomie")) ||
      (typeof data.interests === "string" && data.interests.toLowerCase().includes("gastronomie"))
    );

    const cityName = data.mode === "ville" ? data.ville : (data.villesSouhaitees || "tokyo");
    if (includesGastronomie && cityName) {
      tabelogBlock = `
🍽️ Explorer les meilleures adresses à ${cityName} :
- Ramen → https://tabelog.com/search?sk=ramen%20${cityName}
- Sushi → https://tabelog.com/search?sk=sushi%20${cityName}
- Izakaya → https://tabelog.com/search?sk=izakaya%20${cityName}
- Street food → https://tabelog.com/search?sk=street%20food%20${cityName}
- Michelin → https://tabelog.com/search?sk=michelin%20${cityName}

Merci d’intégrer quelques suggestions de restaurants dans l’itinéraire.
      `;
    }

    if (data.mode === "complet") {
      prompt = `
Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.
L'utilisateur s'appelle ${data.username || "le voyageur"}.
Il souhaite organiser un voyage complet au Japon à partir du ${data.start}, pour une durée de ${data.duration} jours avec un budget de ${data.budget} euros.
${data.villesSouhaitees ? `Il souhaite inclure les villes suivantes : ${data.villesSouhaitees}.` : ""}
${data.lieuxAeviter ? `Il souhaite éviter : ${data.lieuxAeviter}.` : ""}
${data.type ? `Type de voyage : ${data.type}.` : ""}
${data.style ? `Style de voyage souhaité : ${Array.isArray(data.style) ? data.style.join(', ') : data.style}.` : ""}
${data.rythme ? `Rythme de voyage : ${data.rythme}.` : ""}
${data.deja ? `A-t-il déjà voyagé au Japon ? ${data.deja}.` : ""}
${data.interests ? `Centres d’intérêt : ${Array.isArray(data.interests) ? data.interests.join(', ') : data.interests}.` : ""}

Propose un itinéraire jour par jour très personnalisé (lieux, activités, expériences culinaires, recommandations).
${tabelogBlock}
      `;
    }

    else if (data.mode === "ville") {
      prompt = `
Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours à la période suivante : ${data.periodeVille}.
${data.type ? `Type de voyage : ${data.type}.` : ""}
${data.style ? `Style souhaité : ${Array.isArray(data.style) ? data.style.join(', ') : data.style}.` : ""}
${data.rythme ? `Rythme : ${data.rythme}.` : ""}
${data.interests ? `Centres d’intérêt : ${Array.isArray(data.interests) ? data.interests.join(', ') : data.interests}.` : ""}

Propose un itinéraire jour par jour dans cette ville, avec suggestions précises (lieux, quartiers, restaurants, événements).
${tabelogBlock}
      `;
    }

    console.log("📤 Prompt envoyé à OpenRouter :\n", prompt);

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      console.error("❌ Réponse OpenRouter vide ou mal formée :", completion);
      return res.status(500).json({ error: "Réponse OpenRouter invalide ou vide." });
    }

    const response = completion.choices[0].message.content;
    console.log("✅ Réponse reçue.");
    res.json({ result: response });
  } catch (error) {
    console.error("❌ Erreur lors de la génération :", error.message);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});



// ROUTE DE GÉNÉRATION PDF
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

app.post('/api/pdf', (req, res) => {
  const texte = req.body.texte;
  if (!texte) {
    return res.status(400).json({ error: "Texte manquant pour la génération du PDF." });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = Readable.from(Buffer.from([]));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="itineraire-japon.pdf"');

  doc.pipe(res);
  doc.font('Times-Roman').fontSize(12).text(texte, {
    align: 'left'
  });
  doc.end();
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur lancé sur http://localhost:${PORT}`));
