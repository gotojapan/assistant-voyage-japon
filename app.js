const express = require('express');
const bodyParser = require('body-parser');
const { generatePdf } = require("html-pdf-node");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/api/pdf', async (req, res) => {
  const testContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #D22; }
          a { color: blue; text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Itinéraire test</h1>
        <p>Bienvenue dans ce test de génération PDF.</p>
        <p>👉 <a href="https://www.japan-guide.com" target="_blank">En savoir plus</a></p>
      </body>
    </html>
  `;

  const file = { content: testContent };

  try {
    const pdfBuffer = await generatePdf(file, { format: "A4" });

    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      console.error("❌ PDF buffer non généré ou invalide");
      return res.status(500).send("Erreur lors de la génération du PDF");
    }

    console.log("✅ PDF test généré, taille :", pdfBuffer.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=pdf-test.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Erreur PDF (test) :", err);
    res.status(500).send("Erreur PDF test");
  }
});

app.listen(PORT, () => {
  console.log(`🧪 Serveur de test PDF lancé sur le port ${PORT}`);
});