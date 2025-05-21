require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

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
    console.error("❌ Erreur OpenRouter :", err);
    res.status(500).json({ error: err.toString() });
  }
});

app.post('/api/pdf', async (req, res) => {
  const texte = req.body.texte || 'Itinéraire vide.';
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          h1 { color: #D22; }
          a { color: blue; text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Votre itinéraire personnalisé</h1>
        <p>${texte.replace(/\n/g, '<br>')}</p>
      </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=itineraire-japon.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Erreur PDF :", err);
    res.status(500).send("Erreur PDF");
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
Lieux à éviter : ${data.lieuxAeviter}
Remarques : ${data.remarques}
Inclue des suggestions de restaurants avec "👉 [En savoir plus](https://...)" à chaque étape.`;
  } else {
    return `Je souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours (${data.periodeVille}).
Type de voyage : ${data.type}
Style : ${formatList(data.style)}
Rythme : ${data.rythme}
Centres d’intérêt : ${formatList(data.interests)}
Remarques : ${data.remarques}
Donne un itinéraire jour par jour avec activités + suggestions de restaurants ("👉 [En savoir plus](https://...)").`;
  }
}

function formatList(item) {
  if (!item) return '';
  if (Array.isArray(item)) return item.join(', ');
  return item;
}

app.listen(PORT, () => {
  console.log(`🚀 Serveur complet avec PDF lancé sur le port ${PORT}`);
});