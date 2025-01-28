import * as dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config()

// https://www.youtube.com/watch?v=QDIOBsMBEI0&ab_channel=WebWizard
export const sendEmail = async ({
  fromEmail,
  toEmail,
  emailText,
  emailSubject,
  attachments,
}: {
  fromEmail: string
  toEmail: string
  emailText: string
  emailSubject: string
  attachments?: {
    filename: string
    path: string
  }[]
}) => {
  // Create a transporter using SMTP or an email service
  const transporter = nodemailer.createTransport({
    service: 'gmail', // e.g., 'gmail', 'yahoo', 'outlook', etc.
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'alfredodling@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  // Define email data
  const mailOptions = {
    from: fromEmail,
    to: toEmail,
    subject: emailSubject,
    text: emailText,
    attachments: attachments || [],
  }
  console.log('🚀  mailOptions:', mailOptions)

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error)
    } else {
      console.log('Email sent:', info.response)
    }
  })
}
