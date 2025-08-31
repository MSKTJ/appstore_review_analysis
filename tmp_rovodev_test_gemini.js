const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiConnection() {
  try {
    console.log('Testing Gemini API connection...');
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    console.log('API Key length:', process.env.GEMINI_API_KEY?.length);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = "Hello, please respond with a simple JSON: {\"status\": \"ok\", \"message\": \"test successful\"}";
    
    console.log('Sending test request...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Response received:', text);
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Gemini API test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status
    });
  }
}

testGeminiConnection();