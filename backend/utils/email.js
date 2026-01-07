const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, htmlContent) => {
  try {
    // Create transporter
    let transporterConfig;
    
    if (process.env.EMAIL_SERVICE === 'webmail') {
      // Webmail SMTP configuration
      transporterConfig = {
        host: process.env.EMAIL_HOST || 'mail.yourdomain.com',
        port: process.env.EMAIL_PORT || 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };
    } else {
      // Service-based configuration (Gmail, Outlook, etc.)
      transporterConfig = {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };
    }
    
    const transporter = nodemailer.createTransport(transporterConfig);

    // Send mail
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent
    });

    console.log('Email sent successfully');
    return true;
  } catch (err) {
    console.error('Error sending email:', err);
    return false;
  }
};

const sendApplicationNotification = async (email, applicationId, status, applicantName) => {
  let subject, htmlContent;

  switch (status) {
    case 'Submitted':
      subject = 'Your Visa Application Has Been Submitted';
      htmlContent = `
        <h2>Visa Application Submitted</h2>
        <p>Dear ${applicantName},</p>
        <p>Your visa application (ID: ${applicationId}) has been successfully submitted and is now under review.</p>
        <p>We will notify you of any updates or if additional information is required.</p>
        <p>Thank you for choosing Fafali Group Visa Services.</p>
      `;
      break;

    case 'Queried':
      subject = 'Update Required for Your Visa Application';
      htmlContent = `
        <h2>Visa Application Update Required</h2>
        <p>Dear ${applicantName},</p>
        <p>Your visa application (ID: ${applicationId}) requires additional information or documents.</p>
        <p>Please log in to your account to see the specific requirements and provide the requested information.</p>
        <p>Thank you for your prompt attention to this matter.</p>
      `;
      break;

    case 'Approved':
      subject = 'Your Visa Application Has Been Approved';
      htmlContent = `
        <h2>Visa Application Approved</h2>
        <p>Dear ${applicantName},</p>
        <p>We are pleased to inform you that your visa application (ID: ${applicationId}) has been approved!</p>
        <p>You will receive further instructions on the next steps in the process.</p>
        <p>Congratulations and safe travels!</p>
      `;
      break;

    case 'Rejected':
      subject = 'Update on Your Visa Application';
      htmlContent = `
        <h2>Visa Application Status Update</h2>
        <p>Dear ${applicantName},</p>
        <p>We regret to inform you that your visa application (ID: ${applicationId}) has not been approved at this time.</p>
        <p>You may review the application and reapply if you wish. Additional information about the decision may be available in your account.</p>
        <p>Thank you for using Fafali Group Visa Services.</p>
      `;
      break;

    default:
      return false;
  }

  return await sendEmail(to, subject, htmlContent);
};

module.exports = {
  sendEmail,
  sendApplicationNotification
};