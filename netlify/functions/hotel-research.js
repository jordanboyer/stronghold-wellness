// netlify/functions/hotel-research.js
// Agent 7: Hotel Onboarding Generator — research backend.
// Accepts { hotelName, location }, calls Claude with web_search,
// returns structured JSON for portal config generation.

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not configured" }) };

  try {
    const { hotelName, location } = JSON.parse(event.body);
    if (!hotelName || !location) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "hotelName and location required" }) };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        system: `You are a hotel brand researcher for StrongHold Wellness, a luxury in-room fitness platform.
Research hotels using web search and return structured JSON for portal configuration.
Return ONLY valid raw JSON — no markdown fences, no explanation, no extra text. Just the JSON object.`,
        messages: [{
          role: "user",
          content: `Research the hotel: "${hotelName}" in ${location}

Search for their website, amenities, and the surrounding neighborhood. Then return this exact JSON:

{
  "hotelConfig": {
    "name": "HOTEL NAME IN ALL CAPS (e.g. THE DEWBERRY)",
    "subtitle": "WELLNESS EXPERIENCE",
    "location": "City, ST",
    "accent": "#hexcode — primary brand accent color (warm gold/bronze tones work best for dark luxury themes; use actual brand color if found)",
    "accentLight": "#hexcode — 20% lighter variant of accent",
    "dark": "#0d1117",
    "cardBg": "#141b24",
    "cardBorder": "rgba(R,G,B,0.15) using the accent hex values converted to RGB",
    "textPrimary": "#f0ece4",
    "textSecondary": "#8a9ab0"
  },
  "conciergeLabel": "How the hotel refers to service staff — search their site for 'concierge', 'butler', 'front desk'",
  "hasFitnessCenter": true or false based on their listed amenities,
  "localRefs": {
    "cityName": "just the city name (e.g. Nashville, Savannah)",
    "mainStreet": "most iconic nearby street or walking/shopping area",
    "neighborhood": "the district or neighborhood the hotel is in",
    "landmark": "a specific notable nearby landmark — bridge, monument, historic building",
    "activity": "a quintessential local guest activity (carriage tour, honky-tonk, harbor cruise, wine tasting)",
    "waterfront": "a nearby waterfront, park, or outdoor destination guests walk to",
    "climate": "a local climate/environment descriptor (Lowcountry heat, mountain air, Pacific breeze, Music City energy)",
    "localTree": "an iconic local tree or plant",
    "localDrink": "a local specialty drink or cuisine item",
    "cityNickname": "a well-known nickname for the city (the Holy City, the Big Easy, Music City, etc.)",
    "localAdj": "a local adjective or descriptor used by locals (Lowcountry, Appalachian, Coastal, High Country)"
  },
  "researchNotes": "2-3 sentences summarizing the hotel brand, style, and notable features you found"
}`,
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Claude API error:", err);
      return { statusCode: response.status, headers, body: JSON.stringify({ error: "Claude API error", details: err }) };
    }

    const data = await response.json();

    // Extract all text blocks from response
    const textContent = (data.content || [])
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("");

    // Extract JSON — look for the outermost {...} object
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON in response:", textContent);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "No JSON found in Claude response", raw: textContent }) };
    }

    const hotelData = JSON.parse(jsonMatch[0]);
    return { statusCode: 200, headers, body: JSON.stringify(hotelData) };

  } catch (e) {
    console.error("hotel-research error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
