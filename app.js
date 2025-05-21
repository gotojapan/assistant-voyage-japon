require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

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
        <h1>Itinéraire généré</h1>
        <p>${texte.replace(/\n/g, '<br>')}</p>
      </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=itineraire-japon.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Erreur génération PDF :", err);
    res.status(500).send("Erreur génération PDF");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur PDF (puppeteer-core) lancé sur le port ${PORT}`);
});