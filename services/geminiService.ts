
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, JourneyData } from "../types";

export const generateNarrative = async (state: GameState, action: string, journey: JourneyData) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const env = state.distance < 150 ? 'Lowlands (near the sea, slushy snow, heavy air)' : 
              state.distance < 350 ? 'High Passes (jagged obsidian, blue ice, whistling winds)' : 
              'Summit Range (thin air, clouds below, crystalline silence)';
  
  const prompt = `
    You are the narrator for 'Pips' Pilgrimage', a survival game about a lone penguin.
    
    THEME: ${journey.title}
    VOICE: ${journey.voice}
    
    CURRENT SITUATION:
    - Distance: ${state.distance.toFixed(0)} miles ascended.
    - Environment: ${env}
    - Weather: ${state.isBlizzard ? 'A violent, blinding blizzard' : 'Freezing and clear'}
    - Stats: Health ${state.health}%, Hunger ${state.hunger}%, Warmth ${state.warmth}%, Morale ${state.morale}%
    
    ACTION TAKEN: Pips chose to ${action}.
    
    TASK: Write a unique, evocative narrative paragraph (2-4 sentences). 
    Focus on the sensory details of the environment and Pips' internal monologue. 
    Use the journey's specific 'Voice' to flavor the text. 
    Maintain a melancholy, atmospheric, and cinematic tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
      }
    });
    return response.text?.trim() || null;
  } catch (error: any) {
    // Gracefully handle 429 Resource Exhausted or other quota errors
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn("Gemini Quota Exceeded. Switching to High-Entropy Local Narrator.");
    } else {
        console.error("Gemini Narrative Error:", error);
    }
    return null; // Fallback to local engine in App.tsx
  }
};

export const generateEvent = async (state: GameState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Generate a random encounter for a penguin in snowy mountains. Context: Day ${state.day}, ${state.distance.toFixed(0)} miles covered.
         Categories: Hazards, animal encounters, or discoveries. 
         Provide a title, a description, and 2 logical choices with outcomes. 
         The choices should NOT show their stat consequences to the user in the text, but you must provide the stat changes in the JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            eventType: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  outcome: { type: Type.STRING },
                  detailedOutcome: { type: Type.STRING },
                  statChanges: {
                    type: Type.OBJECT,
                    properties: {
                      health: { type: Type.NUMBER },
                      hunger: { type: Type.NUMBER },
                      warmth: { type: Type.NUMBER },
                      morale: { type: Type.NUMBER },
                      fish: { type: Type.NUMBER },
                    }
                  }
                },
                required: ["text", "outcome", "detailedOutcome", "statChanges"]
              }
            }
          },
          required: ["title", "description", "options"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Event Error:", error);
    return null;
  }
};
