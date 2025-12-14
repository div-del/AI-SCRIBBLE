import * as fs from 'fs';

// @ts-ignore - sharp is an optional dependency
let sharp: typeof import('sharp') | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  sharp = require('sharp');
  console.log('Sharp module loaded for PNG rasterization.');
} catch (e) {
  console.warn('Sharp module not found. PNG rasterization will be skipped. Install `sharp` if needed.');
}

/**
 * Robustly extracts the first complete <svg>...</svg> block.
 * Uses a non-greedy regex to prevent matching multiple SVG blocks if they exist.
 * @param text The raw text output from the AI.
 * @returns The extracted SVG string or null if not found.
 */
export function extractSvg(text: string): string | null {
  // Non-greedy match for <svg ...>...</svg>
  const svgRegex = /<svg\s+[^>]*>.*?<\/svg>/s;
  const match = text.match(svgRegex);
  return match ? match[0] : null;
}

/**
 * Performs a basic security and sanity check on the SVG string.
 * @param svg The SVG string to validate.
 * @returns true if valid, false if malicious code is detected.
 */
export function basicSvgSanityCheck(svg: string): boolean {
  // Forbid <script> tags
  if (/<script\s*[^>]*>|<style\s*[^>]*>.*?javascript:/i.test(svg)) {
    console.error('SVG check failed: Found <script> or style with javascript:');
    return false;
  }

  // Forbid event attributes (e.g., onload, onclick, onmouseover)
  // This regex is a simple check; a robust sanitizer is needed for production.
  if (/\s+on[a-z]+=[\s"]*|javascript:/i.test(svg)) {
    console.error('SVG check failed: Found event attribute or javascript: URL');
    return false;
  }

  // TODO: For production, integrate a complete SVG sanitization library (e.g., svg-sanitizer)

  return true;
}

/**
 * Converts an SVG string into a PNG Buffer using the sharp library.
 * @param svgContent The SVG string.
 * @returns A Buffer containing the PNG image data, or null if sharp is unavailable.
 */
export async function svgToPngBuffer(svgContent: string): Promise<Buffer | null> {
  if (!sharp) {
    console.warn('Cannot convert SVG to PNG: sharp library is not available.');
    return null;
  }

  try {
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }) // Resize and ensure transparency
      .png()
      .toBuffer();
    return pngBuffer;
  } catch (error) {
    console.error('Error during SVG to PNG conversion:', error);
    return null;
  }
}
