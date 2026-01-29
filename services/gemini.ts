
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisContext, AIAnalysis } from "../types.ts";

export const analyzeProject = async (context: AnalysisContext): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  let promptContext = "";

  if (context.type === 'github') {
    const repo = context.data;
    promptContext = `
      Repo Name: ${repo.full_name}
      Description: ${repo.description || 'No description provided'}
      Language: ${repo.language || 'Unknown'}
      Topics: ${repo.topics.join(', ')}
      Source: GitHub API Metadata
    `;
  } else {
    const project = context.data;
    promptContext = `
      Project Name: ${project.name}
      Description: ${project.description || 'Analyzed from local zip file'}
      Source: Local Zip Upload
      
      File Structure (partial):
      ${project.files.slice(0, 100).join('\n')}
      
      Key File Contents:
      ${Object.entries(project.keyFiles).map(([name, content]) => `--- ${name} ---\n${content.slice(0, 2000)}\n`).join('\n')}
    `;
  }

  const prompt = `
    Analyze this software project to provide a technical evaluation and a deployment strategy.
    
    Project Context:
    ${promptContext}
    
    Return a JSON object with:
    1. 'summary': A concise summary.
    2. 'keyFeatures': List of 4 key features based on the files or metadata.
    3. 'targetAudience': Who this is for.
    4. 'techStackRating': Rating/Explanation of the stack detected.
    5. 'suggestions': 3 improvements.
    6. 'projectType': The specific type (e.g., "React SPA", "Python Flask API", "Static HTML", "Node.js Service").
    7. 'githubActionsWorkflow': A complete, valid YAML string for a GitHub Actions workflow to deploy this project. If it's a local zip, assume it will be pushed to GitHub Main branch.
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
