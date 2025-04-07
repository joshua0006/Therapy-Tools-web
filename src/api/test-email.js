import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (adjust path if needed)
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function testEmailConfig() {
  try {
    console.log('Testing SMTP configuration...');
    console.log('SMTP settings:');
    console.log(`Host: ${process.env.SMTP_HOST || '(not set)'}`);
    console.log(`Port: ${process.env.SMTP_PORT || '(not set)'}`);
    console.log(`Secure: ${process.env.SMTP_SECURE || '(not set)'}`);
    console.log(`User: ${process.env.SMTP_USER || '(not set)'}`);
    console.log(`From: ${process.env.EMAIL_FROM || '(not set)'}`);
    
    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password',
      },
    });
    
    // Try to verify the connection
    console.log('Trying to verify SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // If verification succeeds, try sending a test email
    console.log('Trying to send a test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: process.env.SMTP_USER || 'user@example.com', // Send to self for testing
      subject: 'Test Email from Therapy-Tools-web',
      text: 'If you are seeing this, the email configuration is working correctly!',
      html: '<p>If you are seeing this, the email configuration is working correctly!</p>',
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Email test failed:');
    console.error(err);
  }
}

testEmailConfig().catch(console.error); 