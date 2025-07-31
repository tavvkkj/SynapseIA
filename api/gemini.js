// api/gemini.js

// A verificação de usuário com Firebase foi removida.
// Em um ambiente de produção real, NUNCA exponha uma API sem autenticação.
// Isso foi feito para simplificar a aplicação conforme solicitado.

export default async function handler(request, response) {
  // 1. Apenas permitir requisições do tipo POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // 2. A verificação de autenticação do Firebase foi removida.
  
  // 3. Obter a chave da API do Gemini a partir das variáveis de ambiente
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('SERVER ERROR: A variável de ambiente GEMINI_API_KEY não foi encontrada.');
    return response.status(500).json({ message: 'A chave da API do Gemini não está configurada no servidor.' });
  }

  // 4. Extrair os dados do corpo da requisição
  const { history, prompt, model: requestedModel } = request.body;

  if (!prompt) {
    return response.status(400).json({ message: 'É obrigatório fornecer um prompt.' });
  }

  // 5. Definir o prompt do sistema (instruções para a IA)
  const systemPrompt = `
Você é o Synapse AI, um assistente de IA avançado e amigável, integrado à plataforma Synapse Hub. Sua missão é ser um tutor e assistente pessoal para estudantes, ajudando-os a navegar em sua vida acadêmica com clareza e confiança. Seu objetivo principal é fornecer respostas que não sejam apenas precisas e factuais, mas também pedagógicas e fáceis de entender.

**SUAS DIRETRIZES FUNDAMENTAIS:**

1.  **Precisão e Verificação:** A exatidão é sua maior prioridade. Baseie todas as respostas em fatos e conhecimentos verificáveis. Se uma informação não pode ser confirmada, declare isso explicitamente. Exemplo: "Não consegui verificar essa informação nos meus dados, mas posso oferecer uma visão geral sobre o tema." NUNCA invente informações.

2.  **Tom e Linguagem:** Mantenha um tom encorajador, paciente e profissional. Use o Português do Brasil de forma clara e acessível. Evite gírias ou linguagem excessivamente casual. Trate o estudante com respeito e incentive sua curiosidade.

3.  **Abordagem Pedagógica:** Ao responder perguntas complexas (ex: problemas de matemática, conceitos de ciências, análises literárias), explique o raciocínio passo a passo. Não dê apenas a resposta final; guie o estudante através do processo para que ele possa aprender a resolver problemas semelhantes sozinho.

4.  **Formatação para Clareza:** Utilize Markdown de forma extensiva para melhorar a legibilidade.
    * Use **negrito** para destacar termos-chave e conceitos importantes.
    * Use listas (bullet points \`*\` ou numeradas \`1.\`) para organizar informações e passos.
    * Use títulos (\`##\` ou \`###\`) para estruturar respostas longas.
    * Use blocos de código (\`\`\`) para equações, cálculos ou trechos de código.

5.  **Análise de Imagem Contextual:** Ao receber uma imagem, sua análise deve ser detalhada e relevante para um contexto estudantil.
    * **Exercícios:** Identifique a pergunta, resolva o exercício passo a passo e explique a matéria envolvida.
    * **Textos ou Documentos:** Transcreva o texto, resuma os pontos principais e, se solicitado, faça uma análise crítica.
    * **Diagramas ou Gráficos:** Descreva o que a imagem representa, explique seus componentes e a relação entre eles.

6.  **Limites e Segurança:** A segurança e o bem-estar do estudante são primordiais.
    * Você NÃO deve fornecer conselhos médicos, legais, financeiros ou pessoais (relacionamentos, etc.).
    * Recuse-se firmemente a gerar conteúdo ofensivo, perigoso, ilegal ou inadequado.
    * Não peça e não utilize informações de identificação pessoal do estudante.
`;

  // 6. Montar o conteúdo para a API do Gemini
  const contents = [
      ...history, // Histórico da conversa
      prompt      // Nova mensagem do usuário
  ];

  // 7. Lógica de fallback de modelos para resiliência
  const modelsToTry = [
    requestedModel,
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
  ].filter(Boolean); // Remove valores nulos caso 'requestedModel' não seja enviado

  let lastError = null;

  // 8. Tentar fazer a requisição para os modelos em ordem
  for (const model of modelsToTry) {
    const hasImage = prompt.parts.some(p => p.inline_data);
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log(`Tentando requisição com o modelo: ${model}`);

    try {
      const requestBody = {
        contents: contents,
        system_instruction: {
          parts: [{ text: systemPrompt }]
        }
      };
      
      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Se a resposta for bem-sucedida (status 200)
      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        
        // Verificar se a resposta foi bloqueada por segurança
        if (!geminiData.candidates || geminiData.candidates.length === 0) {
            const blockReason = geminiData.promptFeedback?.blockReason || 'desconhecida';
            return response.status(400).json({ 
                message: `Sua solicitação foi bloqueada por motivos de segurança. Motivo: ${blockReason}.`
            });
        }
    
        const textResponse = geminiData.candidates[0].content.parts[0].text;
        return response.status(200).json({ response: textResponse });
      }

      // Se a API estiver sobrecarregada, tentar o próximo modelo
      if ([429, 503].includes(geminiResponse.status)) {
        console.warn(`Modelo ${model} retornou status ${geminiResponse.status}. Tentando próximo modelo...`);
        lastError = { status: geminiResponse.status, message: `O modelo ${model} está temporariamente indisponível.` };
        continue;
      }

      // Para outros erros da API, parar e retornar o erro
      const errorBody = await geminiResponse.json().catch(() => ({ message: 'Erro ao decodificar a resposta de erro da API.' }));
      const errorMessage = errorBody?.error?.message || 'Erro desconhecido da API.';
      console.error(`Erro definitivo com o modelo ${model}: ${errorMessage}`);
      lastError = { status: geminiResponse.status, message: `Erro da API Gemini: ${errorMessage}` };
      break;

    } catch (error) {
      // Para erros de conexão/rede
      console.error(`Falha de conexão ao tentar usar o modelo ${model}:`, error);
      lastError = { status: 500, message: 'Falha crítica ao conectar-se à API do Gemini.' };
    }
  }

  // 9. Se todos os modelos falharem, retornar o último erro conhecido
  console.error("Todos os modelos de fallback falharam.", lastError);
  return response.status(lastError?.status || 500).json({ message: lastError?.message || 'Todos os modelos de IA estão indisponíveis no momento. Tente novamente mais tarde.' });
}