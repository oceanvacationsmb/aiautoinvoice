import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

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
  let filePath = null;

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY. Add it in your environment secrets.");
    }

    if (!req.file) {
      throw new Error("No file uploaded.");
    }

    filePath = req.file.path;

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

Read this invoice, screenshot, receipt, handwritten contractor note, Venmo screenshot, Zelle screenshot, payment proof, or material receipt.

Return ONLY valid JSON.
Do NOT explain anything.
Do NOT use markdown.
Do NOT wrap the JSON in code blocks.

Property aliases:
213/B = 213B
213 B = 213B
213-B = 213B
113-12-A = 113A
113 12 A = 113A
11312A = 113A
113-12-B = 113B
113 12 B = 113B
11312B = 113B
204-28 = 204/28
204/28 = 204/28
Tuscan A = Tuscan A
Tuscan B = Tuscan B
Tuscan C = Tuscan C

Category rules:
Cleaning = cleaning, housekeeping, turnover
Plumbing = toilet, shower, faucet, drain, leak, valve
Electrical = electric, outlet, breaker, light switch
HVAC = air conditioning, AC, heat, thermostat
Pool = pool, spa, salt cell, chlorine
Elevator = elevator, lift
Materials = Walmart, Home Depot, Lowes, receipt for supplies
Maintenance = repair, labor, handyman, general work
Pest Control = pest, bugs, roach, ants
Other = unclear

Amount rules:
Use the final total paid, total due, grand total, or payment amount.
For screenshots showing negative amounts, return the positive expense amount.
Do not return subtotal if a total exists.

Date rules:
Use invoice date, issue date, service date, payment date, or receipt date.
Return date as YYYY-MM-DD if possible.

Return exactly this JSON structure:

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

    const resultText = response.output_text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(resultText);

    res.json(parsed);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });

  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

app.listen(3000, () => {
  console.log("AI Invoice Reader running on port 3000");
});
