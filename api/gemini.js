// api/gemini.js

/**
 * @fileoverview API Route Handler for Gemini Pro.
 * This file defines a serverless function that acts as a secure proxy to the 
 * Google Gemini API. It receives requests from the client-side, injects a
 * massive, highly-detailed system prompt to guide the AI's behavior,
 * and forwards the request to Google's backend. It also includes a
 * fallback mechanism to try different models if the primary one fails.
 *
 * @version 2.0.0
 * @author [Your Name/Team]
 * @license MIT
 */

// Import the system prompt from its dedicated file
import { hyperionSystemPrompt } from './hyperionPrompt.js';

// =================================================================
// MAIN HANDLER FUNCTION
// =================================================================
export default async function handler(request, response) {
  // --- 1. Request Method Validation ---
  if (request.method !== 'POST') {
    console.warn(`[API_WARN] Blocked non-POST request from ${request.headers['x-forwarded-for'] || request.socket.remoteAddress}`);
    return response.status(405).json({ message: 'Method Not Allowed. Only POST requests are accepted.' });
  }

  // --- 2. API Key Verification ---
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('[API_FATAL] SERVER CONFIGURATION ERROR: The GEMINI_API_KEY environment variable is not set.');
    return response.status(500).json({ message: 'Internal Server Error: AI service is not configured.' });
  }

  // --- 3. Request Body Desctructuring and Validation ---
  const { history, prompt, model: requestedModel, coreMemories } = request.body;

  if (!prompt || !prompt.parts || !Array.isArray(prompt.parts) || prompt.parts.length === 0) {
    console.error('[API_ERROR] Bad Request: Received a request with an empty or invalid prompt (parts array is missing or empty).');
    return response.status(400).json({ message: 'Bad Request: A non-empty prompt is required.' });
  }

  // --- System Prompt Assembly ---
  // Start with the base prompt imported from the other file
  let systemPrompt = hyperionSystemPrompt;

  // Append user-specific core memories if they exist
  if (coreMemories && Array.isArray(coreMemories) && coreMemories.length > 0) {
    const userMemoriesSection = `
# **PARTE V: MEMÓRIAS ESSENCIAIS ATIVAS (DIRETRIZES DO USUÁRIO - PRIORIDADE MÁXIMA)**
# As seguintes regras foram fornecidas diretamente pelo usuário e são invioláveis. Elas têm precedência sobre qualquer outra diretriz nesta sessão.

${coreMemories.map(mem => `- **[DIRETRIZ DO USUÁRIO OBRIGATÓRIA]** ${mem}`).join('\n')}
`;
    systemPrompt += userMemoriesSection;
  }

  // --- 4. Model Fallback Configuration ---
  const modelsToTry = [
    requestedModel,
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-pro',
  ].filter(Boolean);

  // --- 5. API Call Loop with Fallback ---
  let lastError = null;

  for (const model of modelsToTry) {
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    console.log(`[API_INFO] Attempting to call model: ${model}`);
    
    try {
      const requestBody = {
        contents: [ ...history, prompt ],
        system_instruction: {
          parts: [{ text: systemPrompt }]
        }
      };
      
      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Custom-AI-App/1.0'
        },
        body: JSON.stringify(requestBody),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        
        if (!geminiData.candidates || geminiData.candidates.length === 0 || !geminiData.candidates[0].content) {
           const blockReason = geminiData.promptFeedback?.blockReason || 'desconhecida';
           const safetyRatings = geminiData.promptFeedback?.safetyRatings || [];
           const blockDetails = safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ');
           
           console.warn(`[API_WARN] Request blocked by safety filters for model ${model}. Reason: ${blockReason}`);
           return response.status(400).json({ 
                message: `Sua solicitação foi bloqueada por motivos de segurança. Motivo: ${blockReason}. Detalhes: [${blockDetails}]. Por favor, reformule sua pergunta.`
           });
        }
    
        const textResponse = geminiData.candidates[0].content.parts[0].text;
        console.log(`[API_SUCCESS] Successfully received response from model: ${model}`);
        return response.status(200).json({ response: textResponse });
      }

      if ([429, 503].includes(geminiResponse.status)) {
        lastError = { status: geminiResponse.status, message: `O modelo ${model} está temporariamente sobrecarregado ou indisponível. Tentando o próximo modelo...` };
        console.warn(`[API_WARN] ${lastError.message}`);
        continue;
      }

      const errorBody = await geminiResponse.json().catch(() => ({ error: { message: 'Could not parse error response body.' }}));
      const errorMessage = errorBody?.error?.message || 'Erro desconhecido retornado pela API.';
      lastError = { status: geminiResponse.status, message: `Erro da API Gemini com o modelo ${model}: ${errorMessage}` };
      
      if (geminiResponse.status === 404) {
          console.warn(`[API_WARN] Modelo ${model} não encontrado (404). Verifique o nome do modelo. Tentando o próximo...`);
          continue;
      }
      
      console.error(`[API_ERROR] Non-recoverable error with model ${model}. Status: ${geminiResponse.status}. Message: ${errorMessage}`);
      break;

    } catch (error) {
      console.error("[API_FATAL] CRITICAL FETCH ERROR in API handler:", error);
      lastError = { status: 500, message: 'Falha crítica de rede ao tentar se conectar à API do Gemini. Verifique a conectividade do servidor.' };
      break;
    }
  }
  
  // --- 6. Final Error Response ---
  console.error(`[API_FATAL] All model attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
  return response.status(lastError?.status || 500).json({ message: lastError?.message || 'Todos os modelos de IA configurados falharam ou estão indisponíveis. Verifique os logs do servidor para mais detalhes.' });
}
