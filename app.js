
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { OpenAI } = require('openai');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://assistant-voyage-japon.onrender.com',
    'X-Title': 'Assistant de voyage Japon',
  },
});

app.post('/api/planificateur', async (req, res) => {
  const data = req.body;
  console.log('📤 Données reçues :', data);

  let prompt = '';
  if (data.mode === 'complet') {
    prompt += `Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.
`;
    prompt += `L'utilisateur s'appelle ${data.prenom || 'le voyageur'}.
`;
    prompt += `Il souhaite organiser un voyage complet au Japon à partir du ${data.date}, pour une durée de ${data.duree} jours avec un budget de ${data.budget} euros.

`;
    if (data.villesSouhaitees) prompt += `Il souhaite inclure : ${data.villesSouhaitees}.
`;
    if (data.lieuxAeviter) prompt += `Il souhaite éviter : ${data.lieuxAeviter}.
`;
  } else {
    prompt += `Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours à la période suivante : ${data.periodeVille}.
`;
  }

  if (data.type) prompt += `Type de voyage : ${data.type}.
`;
  if (data.style) prompt += `Style souhaité : ${Array.isArray(data.style) ? data.style.join(', ') : data.style}.
`;
  if (data.rythme) prompt += `Rythme : ${Array.isArray(data.rythme) ? data.rythme.join(', ') : data.rythme}.
`;
  if (data.deja) prompt += `A-t-il déjà voyagé au Japon ? ${data.deja}.
`;
  if (data.interests) prompt += `Centres d’intérêt : ${Array.isArray(data.interests) ? data.interests.join(', ') : data.interests}.
`;

  if (data.mode === 'complet') {
    prompt += `
Propose un itinéraire jour par jour très personnalisé (lieux, activités, expériences culinaires, recommandations).
`;
  } else {
    prompt += `
Propose un itinéraire jour par jour dans cette ville, avec suggestions précises (lieux, quartiers, restaurants, événements).
`;
  }

  if (data.ville || data.villesSouhaitees) {
    const ville = data.ville || data.villesSouhaitees || 'tokyo';
    prompt += `
🍽️ Explorer les meilleures adresses à ${ville.toLowerCase()} :
`;
    prompt += `- Ramen → https://tabelog.com/search?sk=ramen%20${ville}
`;
    prompt += `- Sushi → https://tabelog.com/search?sk=sushi%20${ville}
`;
    prompt += `- Izakaya → https://tabelog.com/search?sk=izakaya%20${ville}
`;
    prompt += `- Street food → https://tabelog.com/search?sk=street%20food%20${ville}
`;
    prompt += `- Michelin → https://tabelog.com/search?sk=michelin%20${ville}
`;
    prompt += `
Merci d’intégrer quelques suggestions de restaurants dans l’itinéraire.
`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'openrouter/gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) throw new Error('Réponse vide');

    console.log('✅ Réponse reçue.');
    res.json({ result });
  } catch (error) {
    console.error('❌ Erreur lors de la génération :', error);
    res.status(500).json({ error: 'Erreur lors de la génération de l’itinéraire.' });
  }
});

app.post('/api/pdf', (req, res) => {
  const { content } = req.body;
  const doc = new PDFDocument();
  const filename = `itineraire-japon.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const lines = content.split('\n');

  doc.font('Helvetica').fontSize(12);

  lines.forEach(line => {
    if (urlRegex.test(line)) {
      const parts = line.split(urlRegex);
      parts.forEach(part => {
        if (urlRegex.test(part)) {
          doc.fillColor('blue').text('➤ Plus d’info', { link: part, underline: true });
        } else {
          doc.fillColor('black').text(part, { continued: true });
        }
      });
      doc.text('');
    } else {
      doc.fillColor('black').text(line);
    }
  });

  doc.end();
});

app.listen(port, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${port}`);
});
