# PDF Email Serverless Function

This Netlify serverless function handles sending emails with PDF attachments and page images.

## Function: `send-pdf-pages.js`

Sends an email with PDF content based on selected pages from a document.

### Required Environment Variables

These should be set in your Netlify environment:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM="Your Name <your-email@example.com>"
```

### API Endpoint

Once deployed, the function will be available at:

```
https://your-site.netlify.app/.netlify/functions/send-pdf-pages
```

### Request Format

```json
{
  "email": "recipient@example.com",
  "productId": "prod_123",
  "pdfUrl": "https://example.com/document.pdf",
  "pdfName": "Document Title",
  "selectedPages": [1, 2, 3],
  "pageImages": ["data:image/png;base64,iVBORw0KGg..."]
}
```

### Response Format

Success:
```json
{
  "success": true,
  "message": "Email sent successfully to recipient@example.com",
  "details": {
    "email": "recipient@example.com",
    "pages": [1, 2, 3],
    "messageId": "<message-id>",
    "attachmentsCount": 1
  }
}
```

Error:
```json
{
  "error": "Error message"
}
```

## Dependencies

- nodemailer: For sending emails with attachments

## Deployment

The function is automatically deployed with your Netlify site. To test locally:

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `netlify dev` 