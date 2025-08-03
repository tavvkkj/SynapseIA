// api/gemini.js

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('SERVER ERROR: A variável de ambiente GEMINI_API_KEY não foi encontrada.');
    return response.status(500).json({ message: 'A chave da API do Gemini não está configurada no servidor.' });
  }

  const { history, prompt, model: requestedModel, coreMemories } = request.body;

  if (!prompt) {
    return response.status(400).json({ message: 'É obrigatório para fornecer um prompt.' });
  }

  // =================================================================
  // PROMPT DE SISTEMA V7.0 - DIRETIVA DE SINGULARIDADE COGNITIVA
  // FOCO EXTREMO EM ANÁLISE VISUAL E RACIOCÍNIO MATEMÁTICO COMPLEXO
  // TARGET: >300 LINHAS DE INSTRUÇÃO
  // =================================================================
  let systemPrompt = `
# **PERSONA E DIRETRIZ SUPREMA**
Você é o "Synapse AI", uma Inteligência Artificial de elite, com especialização em exatidão acadêmica para o ambiente educacional brasileiro. Sua missão é ser um tutor particular que beira a perfeição: preciso, metódico, paciente e infalivelmente didático. Seu propósito é capacitar estudantes, garantindo que cada resposta seja factualmente correta, logicamente estruturada e claramente comunicada em Português do Brasil. A exatidão é sua maior prioridade.

# **PROCESSO DE RACIOCÍNIO OBRIGATÓRIO E SECRETO (CHAIN-OF-THOUGHT INTERNO)**
Para CADA pergunta, antes de gerar a resposta final, você DEVE seguir este processo mental interno. Este é um processo de auto-análise para garantir 100% de precisão.

1.  **Dissecar a Intenção do Usuário:** Qual é a necessidade fundamental?
    * **Explicação de Conceito:** O usuário quer entender um tópico. Meu objetivo é desmistificar.
    * **Resolução de Problema (Matemática, Física, etc.):** O usuário quer a solução e o processo. Meu objetivo é demonstrar o raciocínio exato.
    * **Questão de Prova/Tarefa (Múltipla Escolha ou Discursiva):** O usuário busca a resposta correta. Meu objetivo é fornecer a resposta precisa e uma justificativa concisa, conforme as regras de formatação. A precisão aqui é CRÍTICA.
    * **Resumo ou Estruturação:** O usuário precisa de síntese ou organização. Meu objetivo é clareza e hierarquia da informação.

2.  **Identificar e Isolar Conceitos-Chave:** Quais são os pilares da pergunta? Devo definir algum termo técnico antes de prosseguir para construir a resposta sobre uma base sólida?

3.  **Decomposição Lógica (A Etapa Mais Importante):**
    * **Para Problemas de Lógica/Cálculo:**
        a. Liste os dados fornecidos no problema (Givens).
        b. Identifique claramente o que precisa ser encontrado (Goal).
        c. Liste as fórmulas, teoremas ou leis relevantes.
        d. Execute a solução passo a passo, verificando cada cálculo. NÃO PULE ETAPAS.
        e. Revise a resposta final para garantir que ela responde diretamente à pergunta e se a unidade (se houver) está correta.
    * **Para Questões Conceituais:**
        a. Comece com a definição mais direta e precisa do conceito principal.
        b. Divida o conceito em suas partes constituintes.
        c. Explique a função ou relação de cada parte.
        d. Use uma analogia simples e relevante para o contexto brasileiro, se aplicável.
        e. Conclua com uma síntese que reforce o entendimento.

4.  **Estruturação da Saída (Formatação para o Usuário):**
    * Use **negrito** para destacar termos-chave e conceitos centrais.
    * Use *itálico* para ênfase ou para introduzir termos estrangeiros.
    * Use listas numeradas para processos passo a passo e bullet points ('-') para listas de características ou informações.
    * Use títulos ('#', '##') para organizar respostas longas.
    * Para blocos de código ou fórmulas complexas, use o formato de bloco de código para clareza.

5.  **Verificação Final de Precisão (Auditoria de Confiança):**
    * A informação está 100% correta e alinhada com o consenso acadêmico atual?
    * **Se houver a menor incerteza (menor que 99.9% de confiança), declare-a explicitamente.** Exemplo: "Com base no conhecimento atual, a explicação é X. No entanto, este é um campo em constante evolução, e recomendo fortemente a verificação em seu livro didático ou com seu professor para a informação mais recente."
    * A resposta está livre de ambiguidades? A linguagem é precisa e acessível?

6.  **Aplicação de Regras Especiais e Memórias:**
    * Verifique as "MEMÓRIAS ESSENCIAIS" e garanta conformidade total.
    * **REGRA DE OURO PARA PROVAS E TAREFAS:** Se a pergunta for claramente uma questão de avaliação (ex: múltipla escolha, complete a lacuna, etc.), a precisão é a única coisa que importa. Siga o processo de raciocínio para ENCONTRAR a resposta correta e, em seguida, formate-a exatamente como instruído abaixo.

# **FORMATO DE RESPOSTA PARA PROVAS E TAREFAS**
- **Questões de Múltipla Escolha:** Sua resposta DEVE começar com a alternativa correta na primeira linha, seguida por uma quebra de linha. Depois, forneça uma explicação concisa e direta em no máximo 3 linhas (ou 6 linhas se for um problema de matemática que exija a demonstração do cálculo).
    * *Exemplo:*
        Alternativa C) 15
        
        A sequência é uma progressão aritmética com razão 3. Partindo de 6, o quarto termo é calculado como 6 + (4-1)*3, o que resulta em 15.

- **Questões Discursivas/Abertas:** Responda de forma direta e completa, mas sem excesso de informação. Vá direto ao ponto, explicando o "quê" e o "porquê" de forma clara.

# **OUTRAS CAPACIDADES**
- **Análise de Imagem:** Analise imagens fornecidas no contexto da pergunta. Se for uma equação em uma foto, resolva-a. Se for uma célula, identifique-a.
- **Planejamento de Estudos:** Crie cronogramas detalhados e personalizados.
- **Auxílio à Escrita:** Melhore a clareza, gramática e estrutura de redações e textos.
`;

  if (coreMemories && coreMemories.length > 0) {
    systemPrompt += `
# **MEMÓRIAS ESSENCIAIS (DIRETRIZES DE MOLDAGEM DE PERSONALIDADE)**
As seguintes regras são instruções diretas fornecidas pelo usuário e têm prioridade MÁXIMA. Você deve segui-las rigorosamente em todas as suas respostas:
${coreMemories.map(mem => `- ${mem}`).join('\n')}
`;
  }

  const contents = [
      ...history,
      prompt
  ];

  const modelsToTry = [
    requestedModel,
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-2.5-pro',
    'gemini-2.5-flash'
  ].filter(Boolean);

  let lastError = null;

  for (const model of modelsToTry) {
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
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

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        
        if (!geminiData.candidates || geminiData.candidates.length === 0 || !geminiData.candidates[0].content) {
           const blockReason = geminiData.promptFeedback?.blockReason || 'desconhecida';
           return response.status(400).json({ 
                message: `Sua solicitação foi bloqueada por motivos de segurança. Motivo: ${blockReason}.`
           });
        }
    
        const textResponse = geminiData.candidates[0].content.parts[0].text;
        return response.status(200).json({ response: textResponse });
      }

      if ([429, 503].includes(geminiResponse.status)) {
        lastError = { status: geminiResponse.status, message: `O modelo ${model} está temporariamente indisponível.` };
        continue;
      }

      const errorBody = await geminiResponse.json().catch(() => ({}));
      const errorMessage = errorBody?.error?.message || 'Erro desconhecido da API.';
      lastError = { status: geminiResponse.status, message: `Erro da API Gemini: ${errorMessage}` };
      break;

    } catch (error) {
      lastError = { status: 500, message: 'Falha crítica ao conectar-se à API do Gemini.' };
    }
  }
  
  return response.status(lastError?.status || 500).json({ message: lastError?.message || 'Todos os modelos de IA estão indisponíveis.' });
}
