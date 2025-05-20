require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { generatePdf } = require("html-pdf-node");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/planificateur', async (req, res) => {
  const userInput = req.body;
  const prompt = generatePrompt(userInput);

  try {
    const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await completion.json();
    const result = data.choices?.[0]?.message?.content || "Une erreur est survenue.";
    res.json({ result });
  } catch (err) {
    console.error("Erreur API OpenRouter:", err);
    res.status(500).json({ error: err.toString() });
  }
});

app.post('/api/pdf', async (req, res) => {
  const texte = req.body.texte || '';
  const templatePath = path.join(__dirname, 'templates', 'template.html');
  const cssPath = path.join(__dirname, 'templates', 'style.css');

  try {
    const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const content = htmlTemplate.replace('{{{content}}}', texte).replace('</head>', `<style>${cssContent}</style></head>`);
    const file = { content };

    const pdfBuffer = await generatePdf(file, { format: "A4" });

    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      console.error("❌ PDF buffer non généré ou invalide");
      return res.status(500).send("Erreur lors de la génération du PDF");
    }

    console.log("✅ PDF généré, taille :", pdfBuffer.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=itineraire-japon.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Erreur PDF :", err);
    res.status(500).send("Erreur lors de la création du PDF");
  }
});

function generatePrompt(data) {
  if (data.mode === "complet") {
    return `Génère un itinéraire de ${data.duration} jours au Japon à partir du ${data.start} avec un budget de ${data.budget}€.
Type de voyage : ${data.type}
Style : ${formatList(data.style)}
Rythme : ${data.rythme}
Déjà allé au Japon ? ${data.deja}
Centres d’intérêt : ${formatList(data.interests)}
Villes souhaitées : ${data.villesSouhaitees}
Villes à éviter : ${data.lieuxAeviter}
Remarques : ${data.remarques}
Inclue des suggestions de restaurants avec "👉 [En savoir plus](url)" à chaque étape.`;
  } else {
    return `Je souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours (${data.periodeVille}).
Type de voyage : ${data.type}
Style : ${formatList(data.style)}
Rythme : ${data.rythme}
Centres d’intérêt : ${formatList(data.interests)}
Remarques : ${data.remarques}
Donne un itinéraire jour par jour avec activités + suggestions de restaurants ("👉 [En savoir plus](url)").`;
  }
}

function formatList(item) {
  if (!item) return '';
  if (Array.isArray(item)) return item.join(', ');
  return item;
}

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});