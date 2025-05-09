import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: `${process.env.GOOGLE_GEMINI_API}` });

export async function convertLanguagetoRules(req, res) {
  const { prompt } = req.body;

  try {
    const systemInstruction = {
      text: `You are a query converter that transforms natural language into structured JSON rules for MongoDB queries.
      
      The output JSON must follow these formats:
      
      For simple conditions:
      {
        "field": "fieldName",
        "operator": "greaterThan|lessThan|equal|greaterThanOrEqual|lessThenOrEqual",
        "value": numericValue
      }
      
      For compound conditions:
      {
        "operator": "AND|OR",
        "conditions": [
          {condition1}, {condition2}, etc.
        ]
      }
      
      For more complex nested conditions (can be arbitrarily deep):
      {
        "operator": "OR",
        "conditions": [
          {
            "operator": "AND",
            "conditions": [
              { "field": "visit_count", "operator": "lessThan", "value": 7 },
              { "field": "totalspend", "operator": "lessThan", "value": 132 }
            ]
          },
          {
            "field": "days_inactive", "operator": "greaterThan", "value": 3
          },
          {
            "field": "lastpurchase_day", "operator": "lessThan", "value": 30
          }
        ]
      }
      
      Common field mappings:
      - "visits", "views", "visit count" → "visit_count"
      - "spent", "spending", "purchase amount" → "totalspend"
      - "inactive", "not active", "days since last activity" → "days_inactive"
      - "purchase", "last purchase date", "days since last purchase" → "lastpurchase_day"
      
      Operator mappings:
      - "more than", "greater than", "over", "above" → "greaterThan"
      - "more than or equal", "greater than or equal" → "greaterThanOrEqual"
      - "less than", "under", "below" → "lessThan"
      - "less than or equal",  → "lessThanOrEqual"
      - "equal to", "exactly", "is" → "equal"
      
      Return ONLY the valid JSON with no additional text or explanations.`,
    };

    const userPrompt = `Convert this natural language query into a structured JSON rule that can be used to query a MongoDB database: "${prompt}"

    Examples:
    
    Query: "Customers who spent more than $50"
    Response: {"field": "totalspend", "operator": "greaterThan", "value": 50}
    
    Query: "People with less than 5 visits and more than $100 spent"
    Response: {"operator": "AND", "conditions": [{"field": "visit_count", "operator": "lessThan", "value": 5}, {"field": "totalspend", "operator": "greaterThan", "value": 100}]}
    
    Query: "People who haven't visited more than 7 times and spent less than $132 or people who are inactive for more than 3 days"
    Response: {"operator": "OR", "conditions": [{"operator": "AND", "conditions": [{"field": "visit_count", "operator": "lessThanOrEqual", "value": 7}, {"field": "totalspend", "operator": "lessThan", "value": 132}]}, {"field": "days_inactive", "operator": "greaterThan", "value": 3}]}

    Query: "People who have last purchased within last 30 days"
    Response: {"field": "lastpurchase_day", "operator": "lessThan", "value" : 30}
    
    Now convert my query above to the same JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
      systemInstruction,
    });

    const responseText = response.text;

    let cleanedResponse = responseText.replace(/```json\n|\n```|```/g, "");

    const jsonMatch = cleanedResponse.match(/(\{.*\})/s);
    if (jsonMatch && jsonMatch[1]) {
      cleanedResponse = jsonMatch[1];
    }

    try {
      const jsonResponse = JSON.parse(cleanedResponse);
      res.status(200).json({ success: true, message: jsonResponse });
    } catch (jsonError) {
      console.error(
        "Error parsing JSON response:",
        jsonError,
        "Raw response:",
        cleanedResponse
      );

      res.status(200).json({
        success: true,
        message: cleanedResponse,
        warning: "Could not parse as JSON, returning raw text",
      });
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);

    res.status(500).json({
      success: false,
      message: "Error processing your request",
      error: error.message,
    });
  }
}

export async function generateCampaignMessage(req, res) {
  const { objective } = req.body;

  if (!objective) {
    return res.status(400).json({
      success: false,
      message: "Campaign objective is required",
    });
  }

  try {
    const systemInstruction = {
      text: `You are a marketing message generator that creates personalized campaign messages.
      
      For each campaign objective, generate 2-3 message variants that:
      1. Include a placeholder for the customer's name using \${name}
      2. Are exactly 40-50 words in length (strictly enforce this)
      3. Are engaging, persuasive and relevant to the objective
      4. Use a friendly, conversational tone
      5. Include a clear call-to-action
      6. I do not have some other data about user
    
      
      Format your response as a JSON object with an array of message objects:
      {
        "messages": [
          {
            "id": 1,
            "content": "Your personalized message with \${name} placeholder (40-50 words)"
          },
          {
            "id": 2, 
            "content": "Another message variant with \${name} placeholder (40-50 words)"
          },
          ...
        ]
      }
      
      Return ONLY the valid JSON with no additional text.`,
    };

    const userPrompt = `Generate 2-3 personalized campaign messages for the following objective: "${objective}"
    
    Example:
    objective: I want to offer good discounts to inactive customers
    response : {
    "messages" : [
        {id : 1, content: "hey \${name} personalised message"},{id : 2, content : "personalised message}}
        ]}
        
        STRICTLY DO NOT ADD ANY EXTRA TEXT EXCEPT MESSAGES
        ${systemInstruction}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    });

    const responseText = response.text;
    let cleanedResponse = responseText.replace(/```json\n|\n```|```/g, "");

    const jsonMatch = cleanedResponse.match(/(\{.*\})/s);
    if (jsonMatch && jsonMatch[1]) {
      cleanedResponse = jsonMatch[1];
    }

    try {
      const messagedata = JSON.parse(cleanedResponse);
      res.status(200).json({ success: true, messagedata });
    } catch (err) {
      res
        .status(400)
        .json({ success: false, error: "Invalid JSON response from AI" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
