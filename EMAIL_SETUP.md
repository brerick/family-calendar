# Email Invite Setup Guide

The household settings page now includes email invite functionality. To enable email sending, you'll need to configure an email service provider.

## Recommended: Resend

Resend is the easiest option for sending transactional emails:

### 1. Sign up for Resend
- Go to [resend.com](https://resend.com)
- Create a free account (100 emails/day free tier)

### 2. Get your API key
- Go to API Keys in your Resend dashboard
- Create a new API key
- Copy it to your `.env.local` file:

```bash
RESEND_API_KEY=re_...
```

### 3. Install Resend
```bash
npm install resend
```

### 4. Update the email route

Uncomment the Resend code in `src/app/api/household/invites/email/route.js`:

```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'Family Calendar <invites@yourdomain.com>',
  to: email,
  subject: `You're invited to join ${household.name}`,
  html: `
    <h1>You've been invited!</h1>
    <p>${user.email} has invited you to join <strong>${household.name}</strong> on Family Calendar.</p>
    <p>Your role will be: <strong>${role}</strong></p>
    <p><a href="${inviteUrl}">Click here to accept the invitation</a></p>
    <p>This invitation expires in 7 days.</p>
  `,
});
```

### 5. Verify your domain (optional but recommended)

For production, verify your domain in Resend to send from `invites@yourdomain.com` instead of `onboarding@resend.dev`.

---

## Alternative: SendGrid

If you prefer SendGrid:

### 1. Sign up and get API key
- Go to [sendgrid.com](https://sendgrid.com)
- Get your API key

### 2. Install SendGrid
```bash
npm install @sendgrid/mail
```

### 3. Update the email route

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: email,
  from: 'invites@yourdomain.com',
  subject: `You're invited to join ${household.name}`,
  html: `...html template...`,
});
```

---

## Alternative: AWS SES

For high-volume production use:

### 1. Set up AWS SES
- Enable SES in your AWS account
- Verify your domain
- Get your SMTP credentials or use AWS SDK

### 2. Install AWS SDK
```bash
npm install @aws-sdk/client-ses
```

### 3. Update the email route

```javascript
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const sesClient = new SESClient({ region: 'us-east-1' });

// Send email using SES
const params = {
  Source: 'invites@yourdomain.com',
  Destination: { ToAddresses: [email] },
  Message: {
    Subject: { Data: `You're invited to join ${household.name}` },
    Body: { Html: { Data: '...html template...' } },
  },
};

await sesClient.send(new SendEmailCommand(params));
```

---

## Current Status

Until you configure an email service:
- The "Send Email" button will still create an invite link
- The API will return the invite URL
- You can manually copy and share the URL
- The system will show a message indicating email is not configured

The QR code and link sharing features work without any additional configuration!
