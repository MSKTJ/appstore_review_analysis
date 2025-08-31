require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const modelsToTest = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro',
        'models/gemini-1.5-flash',
        'models/gemini-1.5-pro',
        'models/gemini-pro'
    ];
    
    for (const modelName of modelsToTest) {
        try {
            console.log(`\nTesting model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            const response = await result.response;
            console.log(`✅ ${modelName} works! Response: ${response.text().substring(0, 50)}...`);
            break; // Stop at first working model
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}...`);
        }
    }
}

testModels();