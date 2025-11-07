/**
 * Supabase Edge Function: Send OTP Email
 * 
 * This Edge Function sends OTP codes via email using your SMTP provider.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Login: supabase login
 * 3. Link project: supabase link --project-ref your-project-ref
 * 4. Deploy: supabase functions deploy send-otp
 * 5. Set secrets:
 *    - supabase secrets set SMTP_HOST=smtp.gmail.com
 *    - supabase secrets set SMTP_PORT=587
 *    - supabase secrets set SMTP_USER=your-email@gmail.com
 *    - supabase secrets set SMTP_PASSWORD=your-app-password
 *    - supabase secrets set SMTP_FROM=PLV Lost and Found <noreply@plv.edu.ph>
 * 
 * For Gmail:
 * - Enable 2-factor authentication
 * - Generate an App Password at: https://myaccount.google.com/apppasswords
 * - Use the App Password as SMTP_PASSWORD
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

// SMTP Configuration from environment variables
const SMTP_CONFIG = {
  host: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
  port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
  username: Deno.env.get('SMTP_USER') || '',
  password: Deno.env.get('SMTP_PASSWORD') || '',
  from: Deno.env.get('SMTP_FROM') || 'PLV Lost and Found <noreply@plv.edu.ph>',
};

// Email templates
const getEmailTemplate = (code: string, purpose: string): { subject: string; html: string } => {
  const templates = {
    signup: {
      subject: 'Verify Your PLV Lost and Found Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #003366; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f8f9fa; padding: 30px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #003366; text-align: center; letter-spacing: 5px; padding: 20px; background-color: white; border: 2px dashed #4da6ff; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; padding: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PLV Lost and Found System</h1>
            </div>
            <div class="content">
              <h2>Email Verification</h2>
              <p>Thank you for registering with the PLV Lost and Found System!</p>
              <p>Your verification code is:</p>
              <div class="otp-code">${code}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>Pamantasan ng Lungsod ng Valenzuela</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    reset_password: {
      subject: 'Reset Your PLV Lost and Found Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #003366; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f8f9fa; padding: 30px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #003366; text-align: center; letter-spacing: 5px; padding: 20px; background-color: white; border: 2px dashed #4da6ff; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; padding: 20px; font-size: 12px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PLV Lost and Found System</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>We received a request to reset your password.</p>
              <p>Your password reset code is:</p>
              <div class="otp-code">${code}</div>
              <p>This code will expire in 10 minutes.</p>
              <div class="warning">
                <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and your password will remain unchanged.
              </div>
            </div>
            <div class="footer">
              <p>Pamantasan ng Lungsod ng Valenzuela</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    claim_verification: {
      subject: 'Verify Your Item Claim',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #003366; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f8f9fa; padding: 30px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #003366; text-align: center; letter-spacing: 5px; padding: 20px; background-color: white; border: 2px dashed #4da6ff; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; padding: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PLV Lost and Found System</h1>
            </div>
            <div class="content">
              <h2>Claim Verification</h2>
              <p>You have submitted a claim for a lost item.</p>
              <p>Your verification code is:</p>
              <div class="otp-code">${code}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>Please provide this code to verify your claim.</p>
            </div>
            <div class="footer">
              <p>Pamantasan ng Lungsod ng Valenzuela</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
  };

  return templates[purpose as keyof typeof templates] || templates.signup;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request body
    const { email, code, purpose } = await req.json();

    // Validate inputs
    if (!email || !code || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, code, purpose' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!email.endsWith('@plv.edu.ph')) {
      return new Response(
        JSON.stringify({ error: 'Only PLV email addresses are allowed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get email template
    const { subject, html } = getEmailTemplate(code, purpose);

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        tls: true,
        auth: {
          username: SMTP_CONFIG.username,
          password: SMTP_CONFIG.password,
        },
      },
    });

    // Send email
    await client.send({
      from: SMTP_CONFIG.from,
      to: email,
      subject: subject,
      content: html,
      html: html,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send OTP email', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
