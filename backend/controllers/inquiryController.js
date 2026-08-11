const Inquiry = require('../models/Inquiry');
const nodemailer = require('nodemailer');

// @desc    Submit contact/inquiry form
// @route   POST /api/contact
// @access  Public
const submitInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      res.status(400);
      return next(new Error('Please provide name, email, and message'));
    }

    const inquiry = await Inquiry.create({
      name,
      email,
      phone,
      subject: subject || 'General Inquiry',
      message
    });

    // Attempt to send email confirmation in the background
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
        port: parseInt(process.env.EMAIL_PORT, 10) || 2525,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
          user: process.env.EMAIL_USER || 'placeholder',
          pass: process.env.EMAIL_PASS || 'placeholder'
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'AgriLeaf Support <noreply@agrileaf.com>',
        to: email,
        subject: `AgriLeaf Inquiry Received: ${subject || 'General Inquiry'}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2e7d32;">Hello ${name},</h2>
            <p>Thank you for reaching out to AgriLeaf. We have received your inquiry and our team will get back to you shortly.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Your Submission Details:</strong></p>
            <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
            <p><strong>Message:</strong><br/>${message}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p>Best regards,</p>
            <p><strong>The AgriLeaf Support Team</strong><br/>Smarter Agriculture for a Greener Tomorrow</p>
          </div>
        `
      };

      // Send asynchronously without blocking the REST response
      transporter.sendMail(mailOptions, (mailErr, info) => {
        if (mailErr) {
          console.error('Nodemailer Error sending confirmation email:', mailErr.message);
        } else {
          console.log('Confirmation email sent successfully:', info.messageId);
        }
      });
    } catch (emailError) {
      // Log connection creation error but do not break the HTTP request
      console.error('Nodemailer Setup Error:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. A confirmation email has been sent in the background.',
      data: inquiry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all inquiry submissions
// @route   GET /api/contact
// @access  Private (Admin only)
const getInquiries = async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find({}).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: inquiries.length,
      data: inquiries
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitInquiry,
  getInquiries
};
