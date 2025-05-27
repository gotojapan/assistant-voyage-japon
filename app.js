
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

    // ✅ Bloc enrichissement Kyoto (stylisé, avec emojis et encadré)
    try {
      const enrichBlocMatch = prompt.match(/<div class="recommendation-box">[\s\S]+?<\/div>/i);
      if (enrichBlocMatch) {
        console.log("✅ Bloc enrichissement Kyoto détecté et injecté !");
        let bloc = enrichBlocMatch[0]
          .replace(/<p><strong>[^<]+<\/strong><\/p>/i, '**🌟 Notre recommandation pour enrichir votre séjour :**')
          .replace(/<li>\s*undefined\s*<\/li>/gi, '')
          .replace(/<li>(.*?)<\/li>/g, '- $1')
          .replace(/<[^>]+>/g, '') // remove all remaining HTML tags
          .trim();

        // Encadrement en blockquote Markdown
        bloc = '> ' + bloc.split('\n').map(line => line.trim()).join('\n> ');

        // Insertion juste avant le Jour 1
        result = result.replace(/(##\s*Jour\s*1[^]*)/i, `${bloc}\n\n$1`);
      } else {
        console.warn("⚠️ Bloc enrichissement Kyoto non détecté dans le prompt.");
      }
    } catch (err) {
      console.error("❌ Erreur lors de l'injection du bloc enrichissement :", err);
    }

    // Emojis automatiques
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

    htmlContent = htmlContent.replace(/<a href="([^"]+)"(.*?)>/gi, '<a href="$1" target="_blank"$2>');

    htmlTemplate = htmlTemplate.replace('{{{content}}}', htmlContent);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
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

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
