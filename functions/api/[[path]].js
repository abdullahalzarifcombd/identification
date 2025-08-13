import { GoogleGenerativeAI } from '@google/generative-ai';

export async function onRequestPost({ request, env }) {
  try {
    const { image, mode } = await request.json();
    
    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // Create prompt based on mode
    let prompt;
    if (mode === 'plant') {
      prompt = `Identify this plant. Provide response in JSON format with these keys: 
        plant_name, scientific_name, description, care_instructions. 
        care_instructions should be an array of objects with title and description.
        Also include a confidence score between 0.8-0.99.`;
    } else {
      prompt = `Detect plant diseases in this image. Provide response in JSON format with: 
        is_healthy (boolean), disease_name, description, treatments (array of strings), 
        and confidence (0.8-0.99). If healthy, set disease_name to "Healthy Plant".`;
    }
    
    // Convert base64 to Gemini format
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
    
    // Parse the response
    const responseText = result.response.text();
    
    // Extract JSON from response
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}') + 1;
    const jsonString = responseText.substring(jsonStart, jsonEnd);
    
    const analysisResult = JSON.parse(jsonString);
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}