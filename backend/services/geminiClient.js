const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

let model = null;

if (!apiKey) {
  // In non-production environments, we log a warning but allow the app to run.
  // Calls to generateIncidentExplanation will return a graceful error.
  // eslint-disable-next-line no-console
  console.warn('GEMINI_API_KEY is not set. AI explanations will be disabled.');
} else {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Gemini client:', err);
  }
}

/**
 * Call Gemini to generate a structured incident explanation.
 *
 * @param {string} promptText - Fully constructed prompt text including incident details.
 * @returns {Promise<{ summary: string, businessImpact: string, technicalAnalysis: string, recommendedActions: string[], severityJustification: string } | null>}
 */
async function generateIncidentExplanation(promptText) {
  if (!model) {
    return null;
  }

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'You are a cybersecurity analyst. Explain incidents clearly. ',
                'Return a strict JSON object with the following shape:',
                '{',
                '  "summary": string,',
                '  "businessImpact": string,',
                '  "technicalAnalysis": string,',
                '  "recommendedActions": string[],',
                '  "severityJustification": string',
                '}',
                '\nDo not include any additional text outside the JSON object.\n',
                promptText,
              ].join(''),
            },
          ],
        },
      ],
    });

    const response = result.response;
    const text = response.text();

    if (!text) {
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse Gemini JSON response:', err, 'Raw:', text);
      return null;
    }

    return {
      summary: parsed.summary || '',
      businessImpact: parsed.businessImpact || '',
      technicalAnalysis: parsed.technicalAnalysis || '',
      recommendedActions: Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions
        : [],
      severityJustification: parsed.severityJustification || '',
    };
  } catch (err) {
    // Handle rate limits and generic API errors gracefully
    const message = err && err.message ? err.message : String(err);
    if (message.includes('429') || message.toLowerCase().includes('rate')) {
      // eslint-disable-next-line no-console
      console.error('Gemini rate limit or quota exceeded:', err);
    } else {
      // eslint-disable-next-line no-console
      console.error('Gemini API error:', err);
    }

    return null;
  }
}

module.exports = {
  generateIncidentExplanation,
};
