import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // 10. Check if the API route is actually being called.
  console.log("Contact API reached");

  try {
    // 1. Parse request body
    const body = await request.json().catch(() => ({}));
    const { name, email, subject, message } = body;

    // 11. Check that the request body contains all fields
    console.log("Request body fields parsed:", {
      name: name ? 'present' : 'missing',
      email: email ? 'present' : 'missing',
      subject: subject ? 'present' : 'missing',
      message: message ? 'present' : 'missing',
    });

    // 12. If any field is missing, return validation errors instead of fake success.
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 20) {
      return NextResponse.json({ error: 'Message must be at least 20 characters long.' }, { status: 400 });
    }

    // Extract IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               request.headers.get('x-real-ip')?.trim() || 
               '127.0.0.1';

    // Rate Limiting Check (Max 3 submissions per hour per IP)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSubmissionsCount = await prisma.contactSubmission.count({
      where: {
        ip,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentSubmissionsCount >= 3) {
      console.warn(`[contact-api] Rate limit exceeded for IP: ${ip}. Count: ${recentSubmissionsCount}`);
      return NextResponse.json(
        { error: 'Too many messages. Maximum 3 submissions per hour allowed.' },
        { status: 429 }
      );
    }

    // Check Resend API Key
    const apiKey = process.env.RESEND_API_KEY;

    // 3. Before sending, log the required parameters
    console.log("RESEND_API_KEY exists?", apiKey ? "Yes" : "No");
    console.log("Sender email: PDFAI Hub <onboarding@resend.dev>");
    console.log("Recipient email: pdfaihub@gmail.com");
    console.log("Subject:", `[PDFAI Hub Contact] ${subject.trim()}`);

    if (!apiKey) {
      console.error('[contact-api] Error: RESEND_API_KEY is not defined in environment variables.');
      return NextResponse.json(
        { error: 'Unable to send your message. Please try again later.' },
        { status: 500 }
      );
    }

    // Format current date & time
    const current_date_time = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    // Construct email details
    const emailSubject = `[PDFAI Hub Contact] ${subject.trim()}`;
    const emailBody = `New Contact Form Submission\n\nName:\n${name.trim()}\n\nEmail:\n${email.trim()}\n\nSubject:\n${subject.trim()}\n\nMessage:\n${message.trim()}\n\nSubmitted At:\n${current_date_time}\n\nIP Address:\n${ip}`;

    // 4. Send the email using Resend.
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PDFAI Hub <onboarding@resend.dev>',
        to: 'pdfaihub@gmail.com',
        subject: emailSubject,
        text: emailBody,
      }),
    });

    // 5. After sending, log the complete Resend response details
    console.log("Resend API response HTTP status:", resendResponse.status);

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      let errorObject;
      try {
        errorObject = JSON.parse(errorText);
      } catch {
        errorObject = { rawResponse: errorText };
      }

      console.error("Resend API error response:", errorObject);
      
      // 7. If Resend returns an error: Log, return 500, and show error text
      return NextResponse.json(
        { error: 'Unable to send your message. Please try again later.' },
        { status: 500 }
      );
    }

    const resendData = await resendResponse.json();
    console.log("Resend API success response:", resendData);
    console.log("Email ID:", resendData.id || 'N/A');

    // 6. NEVER return success unless Resend actually confirms acceptance (we verified resendResponse.ok above)
    // 5. Store the submission attempt in the database ONLY after successful Resend confirmation
    await prisma.contactSubmission.create({
      data: {
        ip,
        email: email.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully. We usually reply within 24–48 hours.',
    });

  } catch (error: any) {
    console.error('[contact-api] Fatal Error processing contact submission:', error);
    return NextResponse.json(
      { error: 'Unable to send your message. Please try again later.' },
      { status: 500 }
    );
  }
}
