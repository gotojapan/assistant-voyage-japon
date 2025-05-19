
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY });

app.post('/api/planificateur', async (req, res) => {
  const formData = req.body;
  const prompt = formData.prompt;

  console.log('📤 Prompt envoyé à OpenRouter :\n', prompt);

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'openrouter/openai/gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    const result = chatCompletion.choices?.[0]?.message?.content;

    if (!result) {
      console.error('❌ Réponse OpenRouter vide ou mal formée');
      return res.status(500).json({ error: 'Réponse vide ou invalide' });
    }

    console.log('✅ Réponse reçue.');

    // Enregistre le résultat temporairement pour export PDF
    fs.writeFileSync('./result.txt', result);

    res.json({ result });
  } catch (error) {
    console.error('❌ Erreur lors de la génération :', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export-pdf', (req, res) => {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=itineraire-japon.pdf');
  doc.pipe(res);

  const result = fs.readFileSync('./result.txt', 'utf8');
  const lines = result.split('\n');

  doc.font('Helvetica');

  lines.forEach((line) => {
    if (line.includes('http')) {
      const match = line.match(/https?:\/\/\S+/);
      if (match) {
        const url = match[0];
        doc
          .fillColor('blue')
          .text('➤ Plus d\u2019info', { link: url, underline: true });
      }
    } else {
      doc.fillColor('black').text(line);
    }
  });

  doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
