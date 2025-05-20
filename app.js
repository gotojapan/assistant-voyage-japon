require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

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

function convertMarkdownToPDF(doc, markdownText) {
  const lines = markdownText.split('\n');
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  lines.forEach((line) => {
    const matches = [...line.matchAll(linkRegex)];
    if (matches.length === 0) {
      doc.fillColor('black').text(line);
    } else {
      let lastIndex = 0;
      matches.forEach((match, i) => {
        const [fullMatch, text, url] = match;
        const index = match.index;

        // Ajouter le texte avant le lien
        if (index > lastIndex) {
          doc.fillColor('black').text(line.slice(lastIndex, index), { continued: true });
        }

        // Ajouter lien cliquable avec texte "En savoir plus"
        doc.fillColor('blue')
           .text('En savoir plus', { link: url, underline: true, continued: false });

        lastIndex = index + fullMatch.length;
      });

      // Ajouter le reste de la ligne après le dernier lien
      if (lastIndex < line.length) {
        doc.fillColor('black').text(line.slice(lastIndex));
      }

      // Forcer saut de ligne à la fin du traitement de la ligne
      doc.moveDown(0.5);
    }
  });
}

app.post('/api/pdf', async (req, res) => {
  const texte = req.body.texte || 'Itinéraire vide.';
  const doc = new PDFDocument({ margin: 50 });
  const filename = 'itineraire-japon.pdf';

  res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
  res.setHeader('Content-type', 'application/pdf');

  doc.pipe(res);

  const logoPath = path.join(__dirname, 'public', 'logo_carre_DETOUR.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, { width: 80, align: 'left' });
    doc.moveDown();
  }

  doc.font('Helvetica').fontSize(12);
  convertMarkdownToPDF(doc, texte);

  doc.moveDown(2);
  doc.fontSize(10).fillColor('gray').text('— Itinéraire généré par GO TO JAPAN —', { align: 'center' });

  doc.end();
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