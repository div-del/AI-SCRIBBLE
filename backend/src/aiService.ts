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

  const messages = [{ role: 'user', content: prompt }];

  const response = await withRetry(() => callVercelGateway(modelId, messages, 0)); // temperature: 0 for deterministic output

  const rawText = response.choices[0].message.content;
  const svg = extractSvg(rawText);

  if (!svg) {
    throw new Error('Failed to extract a valid SVG from AI response.');
  }

  if (!basicSvgSanityCheck(svg)) {
    throw new Error('Extracted SVG failed security and sanity checks.');
  }

  const result: GenerateDrawingResult = {
    svg: svg,
    rawText: rawText,
  };

  const pngBuffer = await svgToPngBuffer(svg);
  if (pngBuffer) {
    result.pngBuffer = pngBuffer;
    result.pngBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
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
