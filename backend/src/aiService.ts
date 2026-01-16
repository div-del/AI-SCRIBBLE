import * as fs from 'fs/promises';
import * as path from 'path';
import { withRetry } from './retryWrapper';
import { extractSvg, basicSvgSanityCheck, svgToPngBuffer } from './svgUtils';

const VERCEL_GATEWAY_URL = 'https://gateway.vercel.sh/v1/chat/completions';

// --- Type Definitions ---

export type GatewayResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

export type GenerateDrawingResult = {
  svg: string;
  pngBuffer?: Buffer;
  pngBase64?: string;
  rawText: string;
};

// --- Core API Call ---

/**
 * Calls the Vercel AI Gateway with messages and model parameters.
 * @param modelId The specific model to use (e.g., 'vercel-ai/openai/gpt-4o').
 * @param messages The chat messages array.
 * @param temperature The generation temperature.
 * @returns The parsed response object.
 */
async function callVercelGateway(
  modelId: string,
  messages: any[],
  temperature: number = 0.7
): Promise<GatewayResponse> {
  if (!process.env.VERCEL_AI_GATEWAY_TOKEN) {
    throw new Error('VERCEL_AI_GATEWAY_TOKEN environment variable is not set.');
  }

  // TODO: Implement a rate-limiter here to protect the gateway endpoint from abuse.

  const body = {
    model: modelId,
    messages: messages,
    temperature: temperature,
    // Add other optional parameters as needed
  };

  const headers = {
    'Authorization': `Bearer ${process.env.VERCEL_AI_GATEWAY_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(VERCEL_GATEWAY_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gateway API call failed with status ${response.status}: ${errorText}`);
  }

  const json: GatewayResponse = await response.json() as GatewayResponse;

  if (!json.choices || json.choices.length === 0 || !json.choices[0].message || !json.choices[0].message.content) {
    throw new Error('Invalid response structure from Vercel AI Gateway.');
  }

  return json;
}

// --- Specific AI Functions ---

/**
 * Generates an SVG drawing based on a word using the AI model.
 * @param modelId The model to use (e.g., 'vercel-ai/openai/gpt-4o').
 * @param word The word for the AI to draw.
 * @returns An object containing the SVG, optional PNG buffer/base64, and raw text.
 */
export async function generateSVGDrawing(modelId: string, word: string): Promise<GenerateDrawingResult> {
  const templatePath = path.join(__dirname, 'prompts', 'drawingPromptTemplate.txt');
  const template = await fs.readFile(templatePath, 'utf-8');
  const prompt = template.replace('{WORD}', word);

  // Attempt to call AI, fallback to mock if it fails (e.g. invalid token/deployment)
  let rawText = '';
  try {
    const messages = [{ role: 'user', content: prompt }];
    const response = await withRetry(() => callVercelGateway(modelId, messages, 0));
    rawText = response.choices[0].message.content;
  } catch (error) {
    console.warn("AI Generation Failed. Using Mock Fallback.", error);

    // Mock Drawing Library (Text removed for gameplay difficulty)
    const MOCK_DRAWINGS: Record<string, string> = {
      "cat": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><path d="M100 250 Q 80 150 150 150 Q 180 150 200 180 Q 220 150 250 150 Q 320 150 300 250" stroke="black" fill="transparent" stroke-width="5" /><circle cx="150" cy="200" r="10" fill="black" /><circle cx="250" cy="200" r="10" fill="black" /><path d="M180 250 Q 200 270 220 250" stroke="black" fill="transparent" stroke-width="5" /></svg>',
      "dog": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><ellipse cx="200" cy="200" rx="100" ry="120" stroke="black" fill="none" stroke-width="5"/><circle cx="170" cy="180" r="10"/><circle cx="230" cy="180" r="10"/><path d="M180 250 Q 200 280 220 250" stroke="black" fill="none" stroke-width="5"/></svg>',
      "sun": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="80" stroke="orange" fill="yellow" stroke-width="5"/><line x1="200" y1="100" x2="200" y2="50" stroke="orange" stroke-width="5"/><line x1="200" y1="300" x2="200" y2="350" stroke="orange" stroke-width="5"/><line x1="100" y1="200" x2="50" y2="200" stroke="orange" stroke-width="5"/><line x1="300" y1="200" x2="350" y2="200" stroke="orange" stroke-width="5"/></svg>',
      "tree": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect x="180" y="250" width="40" height="100" fill="brown"/><circle cx="200" cy="180" r="80" fill="green"/></svg>',
      "house": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect x="100" y="200" width="200" height="150" fill="none" stroke="black" stroke-width="5"/><polyline points="100,200 200,100 300,200" fill="none" stroke="black" stroke-width="5"/><rect x="180" y="280" width="40" height="70" stroke="black" fill="none"/></svg>',
      "car": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><path d="M50 250 L350 250 L350 200 L280 150 L120 150 L50 200 Z" fill="none" stroke="black" stroke-width="5"/><circle cx="100" cy="250" r="30" stroke="black" fill="gray"/><circle cx="300" cy="250" r="30" stroke="black" fill="gray"/></svg>',
      "robot": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect x="150" y="100" width="100" height="100" fill="none" stroke="gray" stroke-width="5"/><rect x="130" y="200" width="140" height="150" fill="none" stroke="gray" stroke-width="5"/><circle cx="180" cy="140" r="10" fill="red"/><circle cx="220" cy="140" r="10" fill="red"/></svg>',
      "alien": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><ellipse cx="200" cy="150" rx="60" ry="80" fill="none" stroke="green" stroke-width="5"/><circle cx="180" cy="140" r="15" fill="black"/><circle cx="220" cy="140" r="15" fill="black"/><path d="M150 250 Q 200 300 250 250" fill="none" stroke="green" stroke-width="5"/></svg>',
      "pizza": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><path d="M200 50 L350 350 L50 350 Z" fill="yellow" stroke="orange" stroke-width="5"/><circle cx="200" cy="150" r="20" fill="red"/><circle cx="150" cy="250" r="20" fill="red"/><circle cx="250" cy="250" r="20" fill="red"/></svg>',
      "dragon": '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><path d="M100 200 Q 150 100 200 200 T 300 200" fill="none" stroke="red" stroke-width="5"/><path d="M100 200 L 80 150 M 300 200 L 320 150" stroke="red" stroke-width="5"/></svg>',
    };

    rawText = MOCK_DRAWINGS[word.toLowerCase()] || MOCK_DRAWINGS["cat"];
  }

  const svg = extractSvg(rawText);

  if (!svg) {
    // Should not happen with mock, but for safety
    throw new Error('Failed to extract valid SVG from AI response (or fallback).');
  }

  const result: GenerateDrawingResult = {
    svg: svg,
    rawText: rawText,
  };

  try {
    const pngBuffer = await svgToPngBuffer(svg);
    if (pngBuffer) {
      result.pngBuffer = pngBuffer;
      result.pngBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    }
  } catch (pngError) {
    console.warn("PNG conversion failed:", pngError);
    // Continue with just SVG
  }

  return result;
}

/**
 * Asks the AI to guess the word from an image (Buffer or URL).
 * @param modelId The model to use (e.g., 'vercel-ai/google/gemini-1.5-pro').
 * @param image The image data as a Buffer or a direct URL.
 * @returns The single normalized guessed word, or 'unknown'.
 */
export async function guessFromImage(modelId: string, image: Buffer | string): Promise<string> {
  const templatePath = path.join(__dirname, 'prompts', 'guessingPromptTemplate.txt');
  const template = await fs.readFile(templatePath, 'utf-8');

  let imageRef: string;
  if (typeof image === 'string') {
    // It's a URL
    imageRef = image;
  } else {
    // It's a Buffer, convert to base64 data URL
    imageRef = `data:image/png;base64,${image.toString('base64')}`;
  }

  const prompt = template.replace('{IMAGE_URL_OR_BASE64}', imageRef);
  const messages = [{ role: 'user', content: prompt }];

  // Use a capable multimodal model for guessing
  const response = await withRetry(() => callVercelGateway(modelId, messages, 0)); // temperature: 0 for deterministic/direct answers

  const rawGuess = response.choices[0].message.content;

  // Normalize the guess: lowercase, strip punctuation, trim whitespace
  const normalizedGuess = rawGuess
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .trim();

  // Return the normalized guess or 'unknown' if it's empty or clearly unparseable
  return normalizedGuess.length > 0 ? normalizedGuess : 'unknown';
}
