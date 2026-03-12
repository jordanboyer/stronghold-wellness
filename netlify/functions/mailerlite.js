exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email, groups, fields } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
    }

    const API_KEY = process.env.MAILERLITE_API_KEY;

    if (!API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not configured" }) };
    }

    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ email, groups, fields }),
    });

    const data = await response.json();

    return {
      statusCode: response.ok ? 200 : response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
