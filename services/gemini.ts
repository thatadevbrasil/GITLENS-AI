
import { GoogleGenAI, Type } from "@google/genai";
import { GithubRepo, AIAnalysis } from "../types";

export const analyzeRepo = async (repo: GithubRepo): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze this GitHub repository and provide a technical evaluation.
    Repo Name: ${repo.full_name}
    Description: ${repo.description || 'No description provided'}
    Main Language: ${repo.language || 'Unknown'}
    Topics: ${repo.topics.join(', ')}
    Stars: ${repo.stargazers_count}
    
    Please return a JSON object containing:
    1. A concise summary of the project.
    2. A list of 4 key features.
    3. The likely target audience.
    4. A rating/explanation of the tech stack choice.
    5. 3 suggestions for improvement or next steps.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyFeatures: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          targetAudience: { type: Type.STRING },
          techStackRating: { type: Type.STRING },
          suggestions: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "keyFeatures", "targetAudience", "techStackRating", "suggestions"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("AI analysis failed to generate valid data.");
  }
};
