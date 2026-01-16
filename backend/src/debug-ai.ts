
import * as dotenv from 'dotenv';
dotenv.config();
import { generateSVGDrawing } from './aiService';

async function test() {
    console.log("Testing generateSVGDrawing...");
    try {
        const result = await generateSVGDrawing('vercel-ai/openai/gpt-4o', 'cat');
        console.log("Success!");
        console.log("SVG Length:", result.svg.length);
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

test();
