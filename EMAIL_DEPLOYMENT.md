# Email Functionality on Netlify Deployment

This document explains how the email functionality works in the Netlify deployment.

## Overview of Changes

The application has been modified to support email sending in both development and production (Netlify) environments:

1. Fixed CORS issues by allowing Netlify domains in the API server configurations
2. Updated email service to use relative URLs in production 
3. Added Netlify serverless function for email functionality
4. Updated netlify.toml with proper configuration for API routing

## How to Deploy

1. Push these changes to your GitHub repository
2. Netlify should automatically detect and deploy the changes
3. Set up environment variables in the Netlify dashboard:
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASS
   - SMTP_SECURE
   - EMAIL_FROM

## Testing the Email Function

After deployment, you can test the email function by:

1. Visiting your deployed site (therapytools.netlify.app)
2. Selecting PDF pages and entering an email address
3. Submitting the form to send an email

## Limitations

The Netlify serverless function implementation has some limitations:

1. It doesn't handle PDF conversion (too resource-intensive for serverless)
2. It sends a simplified email without PDF attachments
3. It informs users to use the desktop app for full functionality

## Local Development

For full email functionality during development:

1. Run the local API server: `npm run api`
2. Start the application: `npm run dev`
3. This allows full PDF conversion and sending when working locally 