import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import OpenAI from "openai";

const app = express();

const upload = multer({
  dest: "aiuploads/"
});

app.use(cors());
app.use(express.static("."));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/read-invoice", upload.single("file"), async (req, res) => {

  try {

    const filePath = req.file.path;

    const fileBuffer = fs.readFileSync(filePath);

    const base64File = fileBuffer.toString("base64");

    const mimeType = req.file.mimetype;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [

            {
              type: "input_text",
              text: `
You are an invoice extraction AI.

Read this invoice, screenshot, receipt, handwritten contractor note, venmo screenshot, zelle screenshot or payment proof.

Return ONLY valid JSON.

Rules:

- Do NOT explain anything.
- Do NOT use markdown.
- Return ONLY raw JSON.

Property aliases:
213/B = 213B
213 B = 213B
113-12-A = 113A
113-12-B = 113B
Tuscan A = Tuscan A
Tuscan B = Tuscan B
Tuscan C = Tuscan C

Categories allowed:
Cleaning
Plumbing
Electrical
HVAC
Pool
Elevator
Maintenance
Materials
Pest Control
Other

JSON format:

{
  "vendor": "",
  "invoice_date": "",
  "invoice_number": "",
  "property": "",
  "amount": 0,
  "category": "",
  "description": "",
  "confidence": "",
  "unclear": ""
}
              `
            },

            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64File}`
            }

          ]
        }
      ]
    });

    fs.unlinkSync(filePath);

    const result = response.output_text;

    res.json(JSON.parse(result));

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }

});

app.listen(3000, () => {
  console.log("AI Invoice Reader running on port 3000");
});
