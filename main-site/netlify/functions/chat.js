// netlify/functions/chat.js
// Securely proxies chat widget requests to the Anthropic API.
// The API key is stored as a Netlify environment variable (ANTHROPIC_API_KEY)
// and never exposed to the browser.

exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // CORS headers for your domain
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "API key not configured" })
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Validate the request has messages
    if (!body.messages || !Array.isArray(body.messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid request — messages required" })
      };
    }

    // Simple rate limiting: cap conversation length to prevent abuse
    if (body.messages.length > 30) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Conversation too long" })
      };
    }

    // Forward to Anthropic API with our secure key
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: body.system || "",
        messages: body.messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: "AI service error", details: data })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
