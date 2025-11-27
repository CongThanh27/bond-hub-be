// import { Injectable, Logger } from '@nestjs/common';
// import { Resend } from 'resend';

// @Injectable()
// export class MailService {
//   private resend: Resend;
//   private readonly logger = new Logger(MailService.name);

//   constructor() {
//     const apiKey = process.env.RESEND_API_KEY;
//     if (!apiKey) {
//       this.logger.error('RESEND_API_KEY is not set in environment variables');
//     }
//     this.resend = new Resend(apiKey);
//   }

//   async sendOtpEmail(email: string, otp: string) {
//     try {
//       // eslint-disable-next-line @typescript-eslint/no-unused-vars
//       const data = await this.resend.emails.send({
//         from: 'onboarding@resend.dev',
//         to: [email],
//         subject: 'Your OTP Code for Zalo Like',
//         html: `
//           <!DOCTYPE html>
//           <html>
//           <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           </head>
//           <body style="
//             margin: 0;
//             padding: 0;
//             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//             background-color: #f4f4f4;
//           ">
//             <div style="
//               max-width: 600px;
//               margin: 0 auto;
//               padding: 40px 20px;
//               background-color: #ffffff;
//               border-radius: 12px;
//               box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//             ">
//               <!-- Header with Logo -->
//               <div style="text-align: center; margin-bottom: 30px;">
//                 <img src="https://res.cloudinary.com/dy9b2kamp/image/upload/v1744007142/z6451928408945_3421fa5e5c7af0e49c813a8a68a4a95a_mof1zh.jpg" 
//                      alt="Vodka Logo" 
//                      style="width: 150px; height: auto;"
//                 />
//               </div>

//               <!-- Welcome Text -->
//               <div style="text-align: center; margin-bottom: 30px;">
//                 <h1 style="
//                   color: #004eab;
//                   font-size: 28px;
//                   margin: 0;
//                   padding: 0;
//                 ">Verify Your Account</h1>
//                 <p style="
//                   color: #333333;
//                   font-size: 16px;
//                   margin-top: 10px;
//                 ">Please use the following OTP code to complete your registration</p>
//               </div>

//               <!-- OTP Box -->
//               <div style="
//                 background-color: #FFF8F3;
//                 border: 2px solid #004eab;
//                 border-radius: 8px;
//                 padding: 30px;
//                 text-align: center;
//                 margin: 0 30px 30px 30px;
//               ">
//                 <p style="
//                   font-size: 36px;
//                   font-weight: bold;
//                   color: #004eab;
//                   letter-spacing: 8px;
//                   margin: 0;
//                   padding: 0;
//                 ">${otp}</p>
//               </div>

//               <!-- Expiry Notice -->
//               <div style="text-align: center; margin-bottom: 30px;">
//                 <p style="
//                   color: #666666;
//                   font-size: 14px;
//                   margin: 0;
//                 ">This code will expire in 5 minutes</p>
//               </div>

//               <!-- Security Notice -->
//               <div style="
//                 border-top: 1px solid #EEEEEE;
//                 margin-top: 30px;
//                 padding-top: 20px;
//                 text-align: center;
//               ">
//                 <p style="
//                   color: #999999;
//                   font-size: 12px;
//                   margin: 0;
//                 ">If you didn't request this code, please ignore this email.</p>
//               </div>

//               <!-- Footer -->
//               <div style="
//                 margin-top: 30px;
//                 text-align: center;
//               ">
//                 <p style="
//                   color: #333333;
//                   font-size: 14px;
//                   margin: 0;
//                 ">© 2025 Zalo Like. All rights reserved.</p>
//               </div>
//             </div>
//           </body>
//           </html>
//         `,
//       });

//       this.logger.log(`Email sent successfully to ${email}`);
//       return true;
//     } catch (error) {
//       this.logger.error(`Failed to send email to ${email}:`, error);
//       return false;
//     }
//   }
// }
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      this.logger.error('GMAIL_USER or GMAIL_PASS is not set in environment variables');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f4f4;
        ">
          <div style="
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          ">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://res.cloudinary.com/dntybeqeq/image/upload/v1764266382/zaloliteapp_lv0uno.png" 
                   alt="Zalo Like Logo" 
                   style="width: 150px; height: auto;"
              />
            </div>

            <!-- Welcome Text -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="
                color: #004eab;
                font-size: 28px;
                margin: 0;
                padding: 0;
              ">Verify Your Account</h1>
              <p style="
                color: #333333;
                font-size: 16px;
                margin-top: 10px;
              ">Please use the following OTP code to complete your registration</p>
            </div>

            <!-- OTP Box -->
            <div style="
              background-color: #FFF8F3;
              border: 2px solid #004eab;
              border-radius: 8px;
              padding: 30px;
              text-align: center;
              margin: 0 30px 30px 30px;
            ">
              <p style="
                font-size: 36px;
                font-weight: bold;
                color: #004eab;
                letter-spacing: 8px;
                margin: 0;
                padding: 0;
              ">${otp}</p>
            </div>

            <!-- Expiry Notice -->
            <div style="text-align: center; margin-bottom: 30px;">
              <p style="
                color: #666666;
                font-size: 14px;
                margin: 0;
              ">This code will expire in 5 minutes</p>
            </div>

            <!-- Security Notice -->
            <div style="
              border-top: 1px solid #EEEEEE;
              margin-top: 30px;
              padding-top: 20px;
              text-align: center;
            ">
              <p style="
                color: #999999;
                font-size: 12px;
                margin: 0;
              ">If you didn't request this code, please ignore this email.</p>
            </div>

            <!-- Footer -->
            <div style="
              margin-top: 30px;
              text-align: center;
            ">
              <p style="
                color: #333333;
                font-size: 14px;
                margin: 0;
              ">© 2025 Zalo Like. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.transporter.sendMail({
        from: `"Zalo Like" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Your OTP Code for Zalo Like',
        html,
      });

      this.logger.log(`Email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`, error.stack);
      return false;
    }
  }
}
