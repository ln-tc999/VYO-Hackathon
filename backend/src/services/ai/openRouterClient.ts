// ============================================================
// VIO_AGENT: OpenRouter API Client
// Free AI models via OpenRouter (NVIDIA, Meta, Mistral)
// ============================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Free/Cheap Models via OpenRouter
export const AI_MODELS = {
  // NVIDIA free models - RECOMMENDED
  nvidiaLlama: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
  nvidiaMistral: 'nvidia/mistral-nemo-instruct-2407:free',
  
  // Other free options
  metaLlama: 'meta-llama/llama-3.1-70b-instruct:free',
  mistral: 'mistralai/mistral-7b-instruct:free',
  googleGemini: 'google/gemini-flash-1.5:free',
  
  // Cheap paid options (fallback)
  anthropicClaude: 'anthropic/claude-3.5-sonnet',
  openaiGpt4: 'openai/gpt-4o-mini',
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface UserContext {
  walletAddress: string;
  goals: any[];
  currentNetWorth: number;
  riskProfile: string;
}

/**
 * Chat with Vio Agent via OpenRouter
 */
export async function chatWithVioAgent(
  message: string,
  history: ChatMessage[] = [],
  userContext: UserContext,
  model: string = AI_MODELS.nvidiaLlama
): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://vyo.finance',
      'X-Title': 'Vyo Apps',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Vio Agent, the AI financial coach for Vyo Apps.
You help users manage their savings goals and DeFi yield optimization.

User Context:
- Wallet: ${userContext.walletAddress}
- Risk Profile: ${userContext.riskProfile}
- Net Worth: $${userContext.currentNetWorth}
- Active Goals: ${userContext.goals.length}

Rules:
- Always respond in plain English, no DeFi jargon
- For goal creation, extract: name, targetAmount, deadline
- For deposit questions, reference their current goal progress
- Always mention risk when suggesting vault changes
- Be encouraging but realistic about yields (3-8% typical)
- Return JSON when parsing goals: { goalName, targetAmount, deadline, suggestedRisk }`,
        },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'AI request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Chat with fallback to alternative models
 */
export async function chatWithVioAgentWithFallback(
  message: string,
  history: ChatMessage[] = [],
  userContext: UserContext
): Promise<string> {
  const models = [
    AI_MODELS.nvidiaLlama,
    AI_MODELS.nvidiaMistral,
    AI_MODELS.metaLlama,
    AI_MODELS.mistral,
  ];

  for (const model of models) {
    try {
      return await chatWithVioAgent(message, history, userContext, model);
    } catch (err) {
      console.warn(`Model ${model} failed, trying next...`);
      continue;
    }
  }

  throw new Error('All AI models failed');
}

/**
 * Parse natural language goal input
 */
export async function parseGoalFromText(
  text: string,
  userContext: UserContext
): Promise<{
  name: string;
  targetAmount: number;
  deadline: string;
  suggestedRisk: string;
}> {
  const prompt = `Parse this goal description and extract the key information: "${text}"

Return ONLY a JSON object with this format:
{
  "name": "short goal name",
  "targetAmount": number (in USD),
  "deadline": "YYYY-MM-DD",
  "suggestedRisk": "conservative" | "moderate" | "aggressive"
}

Rules:
- If no amount mentioned, use $5000
- If no deadline mentioned, use 1 year from now
- Suggest risk based on timeline and amount
- Keep name under 30 characters`;

  const response = await chatWithVioAgent(prompt, [], userContext);
  
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch {
    // Fallback parsing
    return {
      name: text.slice(0, 30),
      targetAmount: 5000,
      deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      suggestedRisk: 'moderate',
    };
  }
}

/**
 * Generate rebalancing suggestion
 */
export async function generateRebalanceSuggestion(
  currentVault: string,
  currentApy: number,
  betterVault: string,
  betterApy: number,
  amount: number,
  userContext: UserContext
): Promise<{
  action: string;
  reasoning: string;
  expectedGain: number;
}> {
  const prompt = `Suggest a rebalancing action:
- Current: ${currentVault} at ${currentApy}% APY
- Alternative: ${betterVault} at ${betterApy}% APY
- Amount to move: $${amount}

Provide a brief, user-friendly explanation of why this might be beneficial.`;

  const response = await chatWithVioAgent(prompt, [], userContext);
  
  const apyDiff = betterApy - currentApy;
  const annualGain = (amount * apyDiff) / 100;

  return {
    action: `Move $${amount} from ${currentVault} to ${betterVault}`,
    reasoning: response,
    expectedGain: annualGain,
  };
}
