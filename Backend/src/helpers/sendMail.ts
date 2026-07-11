// import nodemailer from 'nodemailer';

// interface MailOptions {
//   from: string;
//   to: string;
//   subject: string;
//   text?: string;
//   html?: string;
// }

// const sendMail = ({ from, to, subject, text, html }: MailOptions) => {
//   const smtpTransport = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 465,
//     secure: true, // true bắt buộc cho port 465
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });
//   const mailOptions = {
//     from,
//     to,
//     subject,
//     text,
//     html,
//   };
//   smtpTransport.sendMail(mailOptions, function (error, response) {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log(response);
//     }
//   });
// }

// export default sendMail;

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const sendMail = async ({ from, to, subject, text, html }: MailOptions) => {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [to],
      subject,
      text: text || '',
      html: html || '',
    });

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Error sending email via Resend:', error);
  }
}

export default sendMail;