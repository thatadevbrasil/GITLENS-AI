
import { GoogleGenAI, Type } from "@google/genai";
import { GithubRepo, AIAnalysis } from "../types";

export const analyzeRepo = async (repo: GithubRepo): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze this GitHub repository to provide a technical evaluation and a deployment strategy.
    
    Repo Details:
    - Name: ${repo.full_name}
    - Description: ${repo.description || 'No description provided'}
    - Language: ${repo.language || 'Unknown'}
    - Topics: ${repo.topics.join(', ')}
    
    Return a JSON object with:
    1. 'summary': A concise summary.
    2. 'keyFeatures': List of 4 key features.
    3. 'targetAudience': Who this is for.
    4. 'techStackRating': Rating/Explanation of the stack.
    5. 'suggestions': 3 improvements.
    6. 'projectType': The specific type (e.g., "React SPA", "Python Flask API", "Static HTML").
    7. 'githubActionsWorkflow': A complete, valid YAML string for a GitHub Actions workflow to deploy this project (e.g., to GitHub Pages for frontend, or run tests/linting for backend).
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
          },
          projectType: { type: Type.STRING },
          githubActionsWorkflow: { type: Type.STRING }
        },
        required: ["summary", "keyFeatures", "targetAudience", "techStackRating", "suggestions", "projectType", "githubActionsWorkflow"]
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
