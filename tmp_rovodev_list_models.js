require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
    try {
        console.log('Listing available Gemini models...');
        console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Test available models directly
        console.log('\nTesting common Gemini models...');
        
        // Test with gemini-pro
        console.log('\nTesting gemini-pro model...');
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Hello, this is a test.');
        const response = await result.response;
        console.log('Test successful! Response:', response.text());
        
    } catch (error) {
        console.error('Error:', error);
    }
}

listAvailableModels();