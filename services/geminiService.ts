
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async extractFlightAndCareDetails(eventStrings: string[]): Promise<ExtractionResult[]> {
    const prompt = `אתה מתאם טיפול משפחתי חכם בשם "דואגים ללולי". נתח את אירועי היומן הבאים עבור אמא (דיילת אוויר).
    
    1. זהה אירועי עבודה (טיסות, כוננות, משמרת) והתעלם מאירועים אישיים.
    2. עבור כל טיסה:
       - חלץ מספר טיסה, מוצא ויעד.
       - חלץ תאריך בפורמט DD/MM/YYYY והכנס אותו ל-dateLabel.
       - חשב "חלון טיפול": שעה לפני ההמראה ועד שעה אחרי הנחיתה.
       - צור 3 משימות טיפול בילדה "עלמא" בעברית: 
         * "איסוף של עלמא מהמסגרת" (לפי שעת היציאה).
         * "ארוחת ערב לעלמא" (סביב 18:30 אם בטווח הטיסה).
         * "מקלחת והשכבה של עלמא" (סביב 20:00 אם בטווח הטיסה).
    
    החזר רשימת JSON בעברית בלבד. ודא שכל משימה כוללת dateLabel (למשל: "יום חמישי 25/10").

    אירועים לניתוח:
    ${eventStrings.join('\n---\n')}
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              flightNumber: { type: Type.STRING },
              origin: { type: Type.STRING },
              destination: { type: Type.STRING },
              departureTime: { type: Type.STRING },
              arrivalTime: { type: Type.STRING },
              dateLabel: { type: Type.STRING },
              careStart: { type: Type.STRING },
              careEnd: { type: Type.STRING },
              suggestedTasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    description: { type: Type.STRING },
                    time: { type: Type.STRING },
                    dateLabel: { type: Type.STRING }
                  },
                  required: ["type", "description", "time", "dateLabel"]
                }
              }
            },
            required: ["flightNumber", "origin", "destination", "departureTime", "arrivalTime", "dateLabel", "careStart", "careEnd", "suggestedTasks"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("Failed to parse", e);
      return [];
    }
  }
}

export const geminiService = new GeminiService();
