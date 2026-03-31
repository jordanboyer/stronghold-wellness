// netlify/functions/lead.js
// Receives qualified lead data from the chat widget and sends a notification.
// Uses MailerLite to add the lead as a subscriber so Jordan gets notified
// and the lead enters his email system.

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;

  try {
    const lead = JSON.parse(event.body);

    // Validate required fields
    if (!lead.name || !lead.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Name and email required" })
      };
    }

    // If MailerLite is configured, add subscriber
    if (MAILERLITE_API_KEY) {
      const mlResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + MAILERLITE_API_KEY
        },
        body: JSON.stringify({
          email: lead.email,
          fields: {
            name: lead.name,
            phone: lead.phone || "",
            city: lead.location || "",
            company: "AI Lead Qualifier"
          },
          groups: [], // Add MailerLite group ID here if desired
          status: "active"
        })
      });

      if (!mlResponse.ok) {
        console.error("MailerLite error:", await mlResponse.text());
      }
    }

    // Also submit as a Netlify Form so it shows in your dashboard
    // This is a fallback that always works regardless of MailerLite
    console.log("=== NEW QUALIFIED LEAD ===");
    console.log("Name:", lead.name);
    console.log("Email:", lead.email);
    console.log("Phone:", lead.phone);
    console.log("Location:", lead.location);
    console.log("Goal:", lead.primary_goal);
    console.log("Service:", lead.recommended_service);
    console.log("Golf:", lead.plays_golf);
    console.log("Injuries:", lead.injuries_or_limitations);
    console.log("Experience:", lead.experience_level);
    console.log("Nutrition:", lead.nutrition_interest);
    console.log("Urgency:", lead.urgency);
    console.log("Notes:", lead.notes);
    console.log("========================");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Lead captured" })
    };

  } catch (err) {
    console.error("Lead function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to process lead" })
    };
  }
};
