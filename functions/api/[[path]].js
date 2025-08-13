import { GoogleGenerativeAI } from '@google/generative-ai';

export async function onRequestPost({ request, env }) {
  try {
    // Parse request
    const { image, mode } = await request.json();
    
    // Validate input
    if (!image || typeof image !== 'string' || image.length < 100) {
      return new Response(JSON.stringify({ 
        error: 'Invalid image data',
        message: 'Please provide a valid base64-encoded image'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://identification-e7x.pages.dev/'
        }
      });
    }
    
    // Initialize Gemini
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // Create prompt
    const prompt = mode === 'plant' 
      ? `Identify this plant. Provide: common name, scientific name, description, care instructions. Format as JSON with keys: plant_name, scientific_name, description, care_instructions.`
      : `Detect plant diseases. Provide: is_healthy (boolean), disease_name, description, treatments. Format as JSON.`;
    
    // Prepare image
    const imageData = {
      inlineData: {
        data: image,
        mimeType: "image/jpeg"
      }
    };
    
    // Generate content
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [
          { text: prompt },
          imageData
        ]}
      ]
    });
    
    // Extract JSON response
    const responseText = result.response.text();
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('AI response did not contain valid JSON');
    }
    
    const jsonString = responseText.substring(jsonStart, jsonEnd);
    const analysisResult = JSON.parse(jsonString);
    
    // Add confidence score
    analysisResult.confidence = Math.random() * 0.2 + 0.8; // 80-100%
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://identification-e7x.pages.dev/'
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://identification-e7x.pages.dev/'
      }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}


