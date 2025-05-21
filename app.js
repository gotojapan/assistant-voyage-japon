require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ROUTE : Génération texte via OpenRouter
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

// ROUTE : Génération PDF stylé et structuré
app.post('/api/pdf', async (req, res) => {
  const markdown = req.body.texte || 'Itinéraire vide.';

  try {
    const templatePath = path.join(__dirname, 'templates', 'template.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Convertir Markdown → HTML
    let htmlContent = marked.parse(markdown);

    // Styliser les titres "Jour X" → <h2 class="journee">
    htmlContent = htmlContent.replace(/<p>Jour\s*(\d+)[\s:-]*(.*?)<\/p>/gi, (_match, num, title) => {
      const cleanTitle = title ? ` – ${title.trim()}` : '';
      return `<h2 class="journee">Jour ${num}${cleanTitle}</h2>`;
    });

    // Styliser les sous-sections "Matin", "Midi", etc.
    htmlContent = htmlContent.replace(/<p>(🍁|🍱)?\s*(Matin|Midi|Après-midi|Soir)\s*:?\s*<\/p>/gi, (_match, icon, section) => {
      return `<h3 class="moment">${icon || ''} ${section}</h3>`;
    });

    // Transformer les liens "👉 [En savoir plus](...)" → vrais liens cliquables
    htmlContent = htmlContent.replace(/👉\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_match, url, text) => {
      return `<p class="link-block">👉 <a href="${url}" class="lien" target="_blank">${text}</a></p>`;
    });

    // Injecter le HTML stylisé dans le template
    htmlTemplate = htmlTemplate.replace('{{{content}}}', htmlContent);

    // Forcer le chemin du logo
    htmlTemplate = htmlTemplate.replace(
      /src=["']logo_carre_DETOUR.png["']/g,
      'src="https://gotojapan.github.io/assistant-voyage-japon/public/logo_carre_DETOUR.png"'
    );

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });

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
  console.log(`🚀 Serveur final avec PDF stylisé lancé sur le port ${PORT}`);
});