import { GoogleGenAI, Type } from "@google/genai";
import { Exercise, Program, WorkoutNotes, WeeklyReviewData, UserProfile } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BASIC_MODEL = 'gemini-2.5-flash';

export const getMealSuggestion = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: BASIC_MODEL,
      contents: "Sugira uma refeição pós-treino rápida, saudável e saborosa para hipertrofia/recuperação. Max 20 palavras. Em Português.",
    });
    return response.text || "Coma proteínas e carboidratos!";
  } catch (e) {
    console.error(e);
    return "Ovos mexidos com torrada integral.";
  }
};

export const generateFullProgramData = async (goal: string, days: string, level: string) => {
  const prompt = `Crie um programa de musculação completo. 
        Objetivo: ${goal}. 
        Frequência: ${days} dias/semana. 
        Nível: ${level}.
        Estrutura de saída deve ser um JSON com: name (string), objectives (string), workouts (objeto onde chave é 'Treino A', 'Treino B', etc e valor é array de objetos exercise).
        Cada exercise deve ter: name, sets (string num), reps (string range), weight (string '0'), cadence (string '2020'), restSeconds (number).`;

  try {
    const response = await ai.models.generateContent({
      model: BASIC_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            objectives: { type: Type.STRING },
            workouts: {
              type: Type.OBJECT,
              description: "Map of workout days to list of exercises",
              additionalProperties: true // Allow dynamic keys like 'Treino A', 'Treino B'
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI Program Gen Error", e);
    return null;
  }
};

export const generateWorkoutExercises = async (context: string, focus: string, level: string): Promise<Partial<Exercise>[]> => {
  const prompt = `Crie 5-7 exercícios. Contexto: ${context}. Objetivo: ${focus}. Nível: ${level}.`;
  
  try {
    const response = await ai.models.generateContent({
      model: BASIC_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    sets: { type: Type.STRING },
                    reps: { type: Type.STRING },
                    weight: { type: Type.STRING },
                    cadence: { type: Type.STRING },
                    restSeconds: { type: Type.NUMBER }
                }
            }
        }
      }
    });
    
    const data = JSON.parse(response.text || "[]");
    return data;
  } catch (e) {
    console.error("AI Workout Gen Error", e);
    return [];
  }
};

export const getExerciseTip = async (name: string, type: 'breathing' | 'technique'): Promise<string> => {
  const prompt = type === 'breathing' 
    ? `Respiração correta para o exercício: ${name}. Responda em 1 frase curta.` 
    : `Dica técnica essencial e curta sobre a execução de: ${name}.`;

  try {
    const response = await ai.models.generateContent({
      model: BASIC_MODEL,
      contents: prompt,
    });
    return response.text || "Sem informações disponíveis.";
  } catch (e) {
    return "Não foi possível obter a dica.";
  }
};

export const generateWeeklyAnalysis = async (
  programs: Program[], 
  notes: WorkoutNotes, 
  profile: UserProfile
): Promise<WeeklyReviewData | null> => {
  
  // Prepare data summary for the AI
  const activePrograms = programs.filter(p => !p.endDate);
  
  let summaryText = `Perfil do Usuário: ${profile.displayName}, Objetivo: ${profile.goal}.\n`;
  summaryText += `Programas Ativos:\n`;
  
  activePrograms.forEach(prog => {
    summaryText += `- ${prog.name}\n`;
    Object.keys(prog.workouts).forEach(day => {
      summaryText += `  ${day}: `;
      const exs = prog.workouts[day];
      const completedCount = exs.filter(e => e.completed).length;
      summaryText += `${completedCount}/${exs.length} exercícios completos.\n`;
      
      // Add details of heavy lifts or notes
      exs.forEach(ex => {
        if (parseInt(ex.weight) > 0) {
          summaryText += `    * ${ex.name}: ${ex.weight}kg\n`;
        }
        if (ex.notes) {
          summaryText += `    * Nota Exercicio (${ex.name}): ${ex.notes}\n`;
        }
      });
      
      // Add general notes for this day
      const key = `${prog.id}_${day}`;
      if (notes[key]) {
        summaryText += `    * Nota Geral do Treino: ${notes[key]}\n`;
      }
    });
  });

  const prompt = `
    Analise os dados de treino recentes do usuário acima.
    Aja como um treinador pessoal experiente e motivador.
    
    Gere um relatório JSON com:
    1. summary: Um parágrafo curto (max 30 palavras) resumindo o progresso e esforço.
    2. consistencyScore: Um número de 0 a 100 baseado na taxa de completude e esforço percebido.
    3. highlight: O destaque da semana (exercício mais forte ou maior dedicação).
    4. improvementArea: Uma sugestão prática do que melhorar (técnica, consistência, carga).
    5. motivationalQuote: Uma frase curta e poderosa para a próxima semana.
    
    Responda APENAS o JSON.
    Dados para análise:
    ${summaryText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: BASIC_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            consistencyScore: { type: Type.NUMBER },
            highlight: { type: Type.STRING },
            improvementArea: { type: Type.STRING },
            motivationalQuote: { type: Type.STRING },
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Analysis Generation Error", e);
    return null;
  }
};