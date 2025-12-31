/**
 * Generates an accessible, senior-friendly password reset email template.
 * @param {string} username - The name of the user.
 * @param {string} resetUrl - The URL for resetting the password.
 * @param {string} [brandName='Legacy AI'] - The name of the system/brand.
 * @returns {string} - The HTML string for the email.
 */
const getPasswordResetTemplate = (username, resetUrl, brandName = 'Legacy AI') => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - ${brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; color: #333333;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background-color: #007bff; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; letter-spacing: 1px;">${brandName}</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 25px;">Hello <strong>${username}</strong>,</p>
            
            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 25px;">
                We received a request to reset the password for your <strong>${brandName}</strong> account. If you made this request, please click the big blue button below.
            </p>

            <!-- Action Button -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: #ffffff; font-size: 20px; font-weight: bold; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Reset My Password
                </a>
            </div>

            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 25px;">
                This link will work for <strong>1 hour</strong>.
            </p>

            <p style="font-size: 16px; line-height: 1.6; color: #666666; margin-top: 40px;">
                If you did not ask to reset your password, you can safely ignore this email. Your account is safe.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #eeeeee; padding: 20px; text-align: center; border-top: 1px solid #dddddd;">
            <p style="font-size: 14px; color: #666666; margin: 0;">
                Sent by ${brandName} Support. Need help? Reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

module.exports = { getPasswordResetTemplate };
