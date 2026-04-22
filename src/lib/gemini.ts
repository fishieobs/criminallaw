import { GoogleGenAI } from "@google/genai";

// Safe way to access environment variables in both AI Studio and standard Vite (Vercel) environments
const getApiKey = () => {
  // Try AI Studio environment first
  try {
    if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {}
  
  // Fallback to standard Vite environment variables (will require VITE_ prefix in Vercel)
  // @ts-ignore
  return import.meta.env?.VITE_GEMINI_API_KEY || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function analyzeIndictment(text: string) {
  const prompt = `你是一位專業的刑事律師。請分析以下起訴書內容，提取「犯罪事實」與「適用法條」。
請以 JSON 格式回傳，格式如下：
{
  "facts": "犯罪事實內容...",
  "laws": ["法條1", "法條2"],
  "elements": ["構成要件1", "構成要件2"]
}

起訴書內容：
${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeTestimony(indictmentFacts: string, elements: string[], testimonies: { name: string, content: string }[]) {
  const prompt = `你是一位專業的刑事律師。根據起訴書中的犯罪事實與法律構成要件，分析被告及證人的供述證據。
目標：針對每個構成要件，整理出「有利被告」及「不利被告」的說詞。

犯罪事實摘要：
${indictmentFacts}

構成要件：
${elements.join(", ")}

供述證據：
${testimonies.map(t => `【${t.name}】：\n${t.content}`).join("\n\n")}

請以 JSON 格式回傳，格式如下：
{
  "analysis": [
    {
      "element": "構成要件名稱",
      "favorable": ["說詞1", "說詞2"],
      "unfavorable": ["說詞1", "說詞2"]
    }
  ],
  "summary": "整體證據強度分析..."
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateCrossExamination(elements: any[], testimonies: any[]) {
  const prompt = `你是一位專業的刑事詰問專家。請針對目前的案情及證人供述矛盾之處，設計交互詰問的題目。
目標：證明被告無罪（找尋證據矛盾、可信度問題）或輔導有罪（強化連結）。

案情與證據分析：
${JSON.stringify(elements, null, 2)}

證人供述：
${JSON.stringify(testimonies, null, 2)}

請以 JSON 格式回傳，格式如下：
[
  {
    "witness": "證人姓名",
    "goal": "詰問目標（例如：彈劾其證詞一致性）",
    "questions": [
      {
        "question": "題目1",
        "expectedAnswer": "預期回答",
        "strategy": "此題目的詰問策略"
      }
    ]
  }
]
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "[]");
}
