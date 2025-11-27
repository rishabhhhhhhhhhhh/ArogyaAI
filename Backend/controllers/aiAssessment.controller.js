// controllers/aiAssessment.controller.js
const AIAssessment = require('../models/AIAssessment');
const Patient = require('../models/Patient');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to analyze symptoms using Gemini AI ONLY
async function analyzeSymptoms(symptoms, imageData = null) {
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

  let prompt = `You are an expert medical AI assistant. Analyze the following symptoms and provide a comprehensive medical assessment.

Symptoms: ${symptoms}

Please provide your response in the following JSON format:
{
  "condition": "Most likely medical condition or diagnosis",
  "severity": "Low/Medium/High",
  "confidence": 85,
  "recommendations": [
    "Specific medical recommendation 1",
    "Specific medical recommendation 2",
    "Specific medical recommendation 3",
    "Specific medical recommendation 4"
  ],
  "shouldConsultDoctor": true,
  "estimatedRecovery": "Realistic time estimate",
  "summary": "Professional summary for healthcare provider"
}

Guidelines for analysis:
- Provide specific, accurate medical assessments
- Be thorough in your analysis of symptoms
- Give practical, actionable medical recommendations
- Confidence should reflect diagnostic certainty (60-95%)
- Always recommend professional medical consultation for proper diagnosis
- Provide realistic recovery timeframes
- Include relevant medical terminology where appropriate
- Consider differential diagnoses based on symptoms presented`;

  let result;
  if (imageData) {
    // If image is provided, include it in the analysis
    const imagePart = {
      inlineData: {
        data: imageData.split(',')[1], // Remove data:image/jpeg;base64, prefix
        mimeType: imageData.split(';')[0].split(':')[1]
      }
    };
    
    prompt += "\n\nAdditionally, analyze the provided medical image and incorporate your visual findings into the assessment. Consider any visible symptoms, lesions, or abnormalities.";
    result = await model.generateContent([prompt, imagePart]);
  } else {
    result = await model.generateContent(prompt);
  }

  const response = await result.response;
  const text = response.text();
  
  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult;
    } catch (parseError) {
      throw new Error('Failed to parse AI response as JSON');
    }
  } else {
    throw new Error('AI response does not contain valid JSON format');
  }
}

// New endpoint for AI analysis - GEMINI API ONLY
exports.analyzeSymptoms = async (req, res, next) => {
  try {
    const { symptoms, imageData } = req.body;
    
    if (!symptoms || symptoms.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Symptoms description is required' 
      });
    }

    // Analyze symptoms using Gemini AI ONLY
    const analysis = await analyzeSymptoms(symptoms, imageData);
    
    res.json({ 
      success: true, 
      data: analysis 
    });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return the actual error instead of fallback
    res.status(500).json({ 
      success: false, 
      message: `Gemini AI Error: ${error.message}`,
      error: error.toString()
    });
  }
};

exports.createAssessment = async (req, res, next) => {
  try {
    let { patientId, symptoms, condition, severity, confidence, recommendations, followUpRequired, assessmentData, imageData, summary, estimatedRecovery } = req.body;
    
    // If no patientId provided, get it from the authenticated user
    if (!patientId && req.user) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ userId: req.user._id });
      if (patient) {
        patientId = patient._id;
      }
    }
    
    const assessment = await AIAssessment.create({
      patient: patientId,
      symptoms,
      condition,
      severity,
      confidence,
      recommendations,
      followUpRequired,
      assessmentData,
      imageData,
      summary,
      estimatedRecovery
    });

    // Add assessment to patient's record
    await Patient.findByIdAndUpdate(patientId, {
      $push: { aiAssessments: assessment._id }
    });

    const populatedAssessment = await AIAssessment.findById(assessment._id).populate('patient', 'firstName lastName');
    
    res.status(201).json({ success: true, data: populatedAssessment });
  } catch (err) {
    next(err);
  }
};

exports.getPatientAssessments = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    const assessments = await AIAssessment.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('patient', 'firstName lastName');
    
    const total = await AIAssessment.countDocuments({ patient: patientId });
    
    res.json({
      success: true,
      data: assessments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assessment = await AIAssessment.findById(id).populate('patient', 'firstName lastName');
    
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }
    
    res.json({ success: true, data: assessment });
  } catch (err) {
    next(err);
  }
};