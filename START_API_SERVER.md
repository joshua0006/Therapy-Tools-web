# API Server Instructions

This guide explains how to start the API server for email functionality.

## Starting the API Server

To start the API server, run:

```bash
npm run api
```

The server will start on port 3002 by default.

## Email Configuration

Make sure you have configured the following environment variables in your `.env` file:

```
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_SECURE=false
EMAIL_FROM="Therapy Tools <noreply@therapytools.com>"
```

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed with `npm install`
2. Check that the environment variables are properly set
3. Ensure no other service is using port 3002

## Email Features

The API server supports:

- Sending PDF pages via email with high-quality images
- Creating unique links for recipients to view and download pages online
- Storing selections in Firebase for 7 days 