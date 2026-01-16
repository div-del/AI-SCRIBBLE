
import * as dotenv from 'dotenv';
dotenv.config();

const VERCEL_GATEWAY_URL = 'https://gateway.vercel.sh/v1/chat/completions';

async function testModel(modelId: string) {
    console.log(`Testing model: ${modelId}...`);
    try {
        const response = await fetch(VERCEL_GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VERCEL_AI_GATEWAY_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: 'Say hello' }],
            }),
        });

        if (!response.ok) {
            console.error(`FAILED (${response.status}):`, await response.text());
        } else {
            console.log("SUCCESS:", await response.json());
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
}

async function run() {
    await testModel('vercel-ai/openai/gpt-4o');
    await testModel('openai/gpt-4o');
    await testModel('gpt-4o');
}

run();
