import express from "express";
import bodyParser from "body-parser";
import { OpenAI } from "openai";
import PDFDocument from "pdfkit";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://assistant-voyage-japon.onrender.com/",
    "X-Title": "Assistant voyage Japon",
  },
});

app.post("/api/planificateur", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Données reçues :", data);

    let prompt = "";
    if (data.mode === "complet") {
      prompt = `Tu es un expert du Japon et tu crées des itinéraires de voyage personnalisés.
L'utilisateur s'appelle ${data.username}.
Il souhaite organiser un voyage complet au Japon à partir du ${data.start}, pour une durée de ${data.duration} jours avec un budget de ${data.budget} euros.

${data.villesSouhaitees ? `Il souhaite visiter : ${data.villesSouhaitees}.` : ""}
${data.lieuxAeviter ? `Il souhaite éviter : ${data.lieuxAeviter}.` : ""}
Type de voyage : ${data.type}.
Style de voyage souhaité : ${data.style}.
Rythme de voyage : ${data.rythme}.
A-t-il déjà voyagé au Japon ? ${data.deja}.
Centres d’intérêt : ${data.interests.join(", ")}.
${data.remarques ? `Remarques particulières : ${data.remarques}.` : ""}

Propose un itinéraire jour par jour très personnalisé (lieux, activités, expériences culinaires, recommandations).

🍽️ Explorer les meilleures adresses à ${data.villesSouhaitees || "tokyo"} :
- Ramen → https://tabelog.com/search?sk=ramen%20${data.villesSouhaitees || "tokyo"}
- Sushi → https://tabelog.com/search?sk=sushi%20${data.villesSouhaitees || "tokyo"}
- Izakaya → https://tabelog.com/search?sk=izakaya%20${data.villesSouhaitees || "tokyo"}
- Street food → https://tabelog.com/search?sk=street%20food%20${data.villesSouhaitees || "tokyo"}
- Michelin → https://tabelog.com/search?sk=michelin%20${data.villesSouhaitees || "tokyo"}

Merci d’intégrer quelques suggestions de restaurants dans l’itinéraire.
`;
    } else {
      prompt = `Tu es un expert du Japon. L'utilisateur souhaite explorer la ville de ${data.ville} pendant ${data.joursVille} jours à la période suivante : ${data.periodeVille}.
Type de voyage : ${data.type}.
Style souhaité : ${data.style}.
Rythme : ${data.rythme}.
Centres d’intérêt : ${data.interests.join(", ")}.
${data.remarques ? `Remarques particulières : ${data.remarques}.` : ""}

Propose un itinéraire jour par jour dans cette ville, avec suggestions précises (lieux, quartiers, restaurants, événements).

🍽️ Explorer les meilleures adresses à ${data.ville} :
- Ramen → https://tabelog.com/search?sk=ramen%20${data.ville}
- Sushi → https://tabelog.com/search?sk=sushi%20${data.ville}
- Izakaya → https://tabelog.com/search?sk=izakaya%20${data.ville}
- Street food → https://tabelog.com/search?sk=street%20food%20${data.ville}
- Michelin → https://tabelog.com/search?sk=michelin%20${data.ville}

Merci d’intégrer quelques suggestions de restaurants dans l’itinéraire.
`;
    }

    console.log("📤 Prompt envoyé à OpenRouter :
", prompt);

    const completion = await openai.chat.completions.create({
      model: "openrouter/gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      console.error("❌ Réponse OpenRouter vide ou mal formée :", completion);
      return res.status(500).json({ error: "Réponse vide ou mal formée." });
    }

    console.log("✅ Réponse reçue.");

    // PDF
    const doc = new PDFDocument();
    const chunks = [];
    doc.font("Helvetica").fontSize(12);
    result.split("\n").forEach((line) => {
      const match = line.match(/https?:\/\/(\S+)/);
      if (match) {
        const url = match[0];
        doc.fillColor("blue").text("👉 plus d’info", {
          link: url,
          underline: true,
        });
      } else {
        doc.fillColor("black").text(line);
      }
    });
    doc.end();
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      const base64Pdf = pdfBuffer.toString("base64");
      res.json({ result, pdf: base64Pdf });
    });
  } catch (err) {
    console.error("❌ Erreur lors de la génération :", err);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});

app.listen(3000, () => {
  console.log("✅ Serveur lancé sur http://localhost:3000");
});