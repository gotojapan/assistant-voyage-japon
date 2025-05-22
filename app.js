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

app.use(cors({ origin: 'https://gotojapan.github.io' }));
app.use(bodyParser.json());
app.use(express.static('public'));

// ROUTE : Génération texte via OpenRouter
const { generatePrompt } = require('./generatePrompt'); // à placer en haut du fichier (hors route)

app.post('/api/planificateur', async (req, res) => {
  const userInput = req.body;
  const prompt = generatePrompt(userInput); // ⬅️ tu avais oublié cette ligne !

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

    // Injecter blocs .jour à partir des <h2> (Jour X : ...)
    htmlContent = htmlContent.replace(/<h2>(Jour\s*\d+.*?)<\/h2>/gi, (_m, title) => {
      return `</div><div class="jour"><h2 class="journee">${title}</h2>`;
    });
    htmlContent = `<div class="jour">` + htmlContent + `</div>`;

    // Styliser les moments de la journée (Matin, Midi, etc.)
    htmlContent = htmlContent.replace(/<h3>(Matin|Midi|Après-midi|Soir)<\/h3>/gi, (_m, label) => {
      return `<h3 class="moment">🍱 ${label}</h3>`;
    });

    // Styliser les liens cliquables "👉"
    htmlContent = htmlContent.replace(/👉\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, url, txt) => {
      return `<p class="link-block">👉 <a href="${url}" class="lien" target="_blank">${txt}</a></p>`;
    });

    // Injecter le contenu dans le template
    htmlTemplate = htmlTemplate.replace('{{{content}}}', htmlContent);

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

// PROMPT dynamique structuré
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

Structure impérative :
- Utilise des titres de niveau 2 : ## Jour X : titre
- Utilise des sous-titres de niveau 3 : ### Matin, ### Midi, ### Après-midi, ### Soir
- Chaque moment doit être suivi de texte descriptif
- À la fin de chaque restaurant ou activité, ajoute 👉 [En savoir plus](https://...)
- Pas de bullet points, pas de tableaux, pas de code`;
  } else {
    return `Je souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours (${data.periodeVille}).
Type de voyage : ${data.type}
Style : ${formatList(data.style)}
Rythme : ${data.rythme}
Centres d’intérêt : ${formatList(data.interests)}
Remarques : ${data.remarques}

Structure impérative :
- Utilise des titres de niveau 2 : ## Jour X : titre
- Utilise des sous-titres de niveau 3 : ### Matin, ### Midi, ### Après-midi, ### Soir
- Chaque moment doit être suivi de texte descriptif
- À la fin de chaque restaurant ou activité, ajoute 👉 [En savoir plus](https://...)
- Pas de bullet points, pas de tableaux, pas de code`;
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
