require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { generatePrompt } = require('./generatePrompt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'https://gotojapan.github.io' }));
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

    const responseJson = await completion.json();
    let result = responseJson.choices?.[0]?.message?.content || "⚠️ Aucun résultat généré.";
    
    // ✅ Injection forcée de l'enrichissementVille si présent dans le prompt
    if (prompt.includes('Avant de commencer')) {
    const enrichStart = prompt.indexOf('Avant de commencer');
    const enrichEnd = prompt.search(/##\s*Jour\s*1/i);

  if (enrichStart !== -1 && enrichEnd !== -1) {
    const bloc = prompt.substring(enrichStart, enrichEnd).trim();
    console.log("✅ Bloc enrichissement injecté");
    result = `${bloc}\n\n${result}`;
  } else {
    console.warn("⚠️ Bloc enrichissement non trouvé malgré le mot-clé.");
  }
}

    // 🔁 Réinjection de la recommandation s'il y en a une
    const enrichStart = prompt.indexOf('---\nAvant de commencer, voici une suggestion personnelle');
    const enrichEnd = prompt.indexOf('Structure impérative');

    if (enrichStart !== -1 && enrichEnd !== -1) {
      const blocRecommandation = prompt.substring(enrichStart, enrichEnd).trim();
      result = `${blocRecommandation}\n\n${result}`;
    }

    // Ajouter emojis dans les moments de la journée
    result = result.replace(/###\s*Matin/g, '### 🍵 Matin');
    result = result.replace(/###\s*Midi/g, '### 🍽️ Midi');
    result = result.replace(/###\s*Après-midi/g, '### ☀️ Après-midi');
    result = result.replace(/###\s*Soir/g, '### 🌙 Soir');

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

    let htmlContent = marked.parse(markdown);

    htmlContent = htmlContent.replace(/<h2>(Jour\s*\d+.*?)<\/h2>/gi, (_m, title) => {
      return `</div><div class="jour"><h2 class="journee">${title}</h2>`;
    });
    htmlContent = `<div class="jour">` + htmlContent + `</div>`;

    htmlContent = htmlContent.replace(/<h3>\s*Matin\s*<\/h3>/gi, '<h3 class="moment">🍵 Matin</h3>');
    htmlContent = htmlContent.replace(/<h3>\s*Midi\s*<\/h3>/gi, '<h3 class="moment">🍽️ Midi</h3>');
    htmlContent = htmlContent.replace(/<h3>\s*Après-midi\s*<\/h3>/gi, '<h3 class="moment">☀️ Après-midi</h3>');
    htmlContent = htmlContent.replace(/<h3>\s*Soir\s*<\/h3>/gi, '<h3 class="moment">🌙 Soir</h3>');

    htmlContent = htmlContent.replace(/👉\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, url, txt) => {
      return `<p class="link-block">👉 <a href="${url}" class="lien" target="_blank">${txt}</a></p>`;
    });

    const dateStr = req.body.date || '';
    const introBlock = generateIntroHtmlForPdf(dateStr);
    htmlTemplate = htmlTemplate.replace('{{{content}}}', introBlock + htmlContent);

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

function generateIntroHtmlForPdf(dateStr) {
  if (!dateStr) return '';
  const mois = new Date(dateStr).getMonth();
  const moisNom = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][mois];

  const meteo = {
    0: { t: "0-10°C", icon: "❄️", tips: "Prévoir vêtements chauds et imperméables." },
    1: { t: "3-12°C", icon: "🌬️", tips: "Encore froid. Restez couvert." },
    2: { t: "6-15°C", icon: "🌱", tips: "Premiers signes du printemps." },
    3: { t: "10-20°C", icon: "🌸", tips: "Saison des cerisiers en fleurs." },
    4: { t: "15-25°C", icon: "🌤️", tips: "Températures douces et floraisons." },
    5: { t: "18-27°C", icon: "🌦️", tips: "Début de la saison des pluies." },
    6: { t: "23-32°C", icon: "🌞", tips: "Chaleur et humidité marquées." },
    7: { t: "25-33°C", icon: "☀️", tips: "Très chaud, bien s'hydrater." },
    8: { t: "22-30°C", icon: "🍂", tips: "Fin de l'été, premiers typhons." },
    9: { t: "17-25°C", icon: "🍁", tips: "Temps agréable, début de l'automne." },
    10: { t: "10-20°C", icon: "🍂", tips: "Feuilles rouges, frais le matin." },
    11: { t: "5-12°C", icon: "🎄", tips: "Froid sec, fêtes lumineuses." },
  }[mois];

  return `
  <div style="display: flex; gap: 12px; margin-bottom: 24px;">
    <div style="flex:1; border-left: 4px solid #DF2A2F; padding: 12px; background: #f5f5f5; border-radius: 6px;">
      <h3 style="margin: 0 0 8px; font-size: 16px; color: #DF2A2F">${meteo.icon} Météo en ${moisNom}</h3>
      <ul style="margin: 0; padding-left: 18px;">
        <li>Températures moyennes : ${meteo.t}</li>
        <li>${meteo.tips}</li>
        <li>Vêtements : couches légères + pull / veste</li>
      </ul>
    </div>
    <div style="flex:1; border-left: 4px solid #DF2A2F; padding: 12px; background: #f5f5f5; border-radius: 6px;">
      <h3 style="margin: 0 0 8px; font-size: 16px; color: #DF2A2F">🚆 Transport</h3>
      <ul style="margin: 0; padding-left: 18px;">
        <li><strong>Japan Rail Pass</strong> : à acheter avant le départ</li>
        <li><strong>Pass régionaux</strong> : Hakone / Kamakura / Kansai</li>
        <li><strong>IC Cards</strong> : Suica, Pasmo, Icoca</li>
      </ul>
    </div>
    <div style="flex:1; border-left: 4px solid #DF2A2F; padding: 12px; background: #f5f5f5; border-radius: 6px;">
      <h3 style="margin: 0 0 8px; font-size: 16px; color: #DF2A2F">💡 Conseils pratiques</h3>
      <ul style="margin: 0; padding-left: 18px;">
        <li>💴 Devise : yen (prévoir du liquide)</li>
        <li>📶 Pocket WiFi ou carte SIM</li>
        <li>🔌 100V Type A / B</li>
        <li>🗣️ Appli de traduction recommandée</li>
        <li>🧦 Étiquette : pas de pourboire, déchaussage</li>
      </ul>
    </div>
  </div>
  `;
}

app.listen(PORT, () => {
  console.log(`🚀 Serveur final avec PDF stylisé lancé sur le port ${PORT}`);
});

