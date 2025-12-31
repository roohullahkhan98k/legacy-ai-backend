const nodemailer = require('nodemailer');
const { getPasswordResetTemplate } = require('../emailTemplates/resetPasswordTemplate');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
            port: parseInt(process.env.SMTP_PORT || '2525'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        this.fromEmail = process.env.SMTP_FROM || 'no-reply@example.com';
    }

    async sendPasswordResetEmail(to, username, resetUrl) {
        const subject = 'Password Reset Request';
        const text = `You requested a password reset. Please click the following link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`;

        // Use the comprehensive template with personalization
        const html = getPasswordResetTemplate(username, resetUrl, 'Legacy AI');

        try {
            await this.transporter.sendMail({
                from: this.fromEmail,
                to,
                subject,
                text,
                html
            });
            console.log(`Password reset email sent to ${to}`);
        } catch (error) {
            console.error('Email sending failed:', error);
            throw new Error('Email sending failed');
        }
    }
}

module.exports = new EmailService();
