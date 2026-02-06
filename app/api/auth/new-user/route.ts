import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();
    const origin = request.headers.get('origin') || '';

    if (process.env.GMAIL_APP_PASSWORD && process.env.ADMIN_EMAIL) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.ADMIN_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `Quote Sheet <${process.env.ADMIN_EMAIL}>`,
        to: process.env.ADMIN_EMAIL,
        subject: 'New User Access Request',
        html: `
          <h2>New User Access Request</h2>
          <p>A new user has requested access to Quote Sheet:</p>
          <ul>
            <li><strong>Name:</strong> ${name || 'Not provided'}</li>
            <li><strong>Email:</strong> ${email}</li>
          </ul>
          <p>Please log in to the admin portal to approve or reject this request.</p>
          <p><a href="${origin}/admin/users">Go to User Management</a></p>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to send admin notification email:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
