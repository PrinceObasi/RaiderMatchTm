import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUBJECT =
  "Welcome to RaiderMatch — built by Texas Tech students, for Texas Tech students";

const RAW_BODY = `Subject: Welcome to RaiderMatch — built by Texas Tech students, for Texas Tech students

Hi {STUDENT_NAME},

My name is Prince Emeka-Obasi, and I'm a senior here at Texas Tech University majoring in Computer Science.

Thanks for giving RaiderMatch a chance. I know how overwhelming it can feel trying to land your first internship. I've been where you have endless applications and interviews that don't lead anywhere.

I built RaiderMatch as a CS student at Texas Tech because I realized how tough it was to break into internships without the right connections. Handshake and LinkedIn are crowded, and it's hard to know where you actually stand. RaiderMatch is different:

• It's built exclusively for Texas Tech CS students
• It's focused on getting users curated roles and interviews
• It helps you discover opportunities faster and learn more about what's out there in the CS job market

We're also partnering with the CS Department and various companies and firms to post their openings directly on RaiderMatch, creating a seamless candidate selection process to help Tech students secure interviews. Stay tuned for exclusive opportunities coming soon.

This is just the beginning. RaiderMatch will grow, improve, and hopefully become a tool that makes your internship search less stressful. By being here, you're part of that journey.

Thanks again for trusting me with a part of your career search. I'm excited to see where RaiderMatch takes you.

— Prince Emeka-Obasi
Founder, RaiderMatch`;

function renderBody(name: string | null | undefined): string {
  const safeName = (name ?? "").trim() || "Student";
  return RAW_BODY.replace("{STUDENT_NAME}", safeName);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify hook secret
  const secret = Deno.env.get("HOOK_SECRET");
  if (!secret || req.headers.get("x-hook-secret") !== secret) {
    console.error("Invalid or missing hook secret");
    return new Response("forbidden", { status: 403 });
  }

  try {
    const { to, name } = await req.json();
    
    if (!to) {
      console.error("Missing 'to' parameter");
      return new Response("Missing 'to' parameter", { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY environment variable");
      return new Response("Missing RESEND_API_KEY", { status: 500 });
    }

    const emailBody = renderBody(name);

    console.log(`Sending welcome email to: ${to} (name: ${name})`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RaiderMatch <no-reply@raidermatch.com>",
        to,
        subject: SUBJECT,
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API error: ${errorText}`);
      return new Response(`Resend error: ${errorText}`, { 
        status: 502,
        headers: corsHeaders 
      });
    }

    const result = await response.json();
    console.log(`Welcome email sent successfully to ${to}:`, result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in send-welcome function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
