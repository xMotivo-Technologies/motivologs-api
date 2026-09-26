const resend = require("../../config/resend");

async function sendForgotPasswordMail({
  email,
  firstName,
  token,
}) {
  try {
    console.log("Sending forgot password email to:", email);

    const resetUrl =
      `https://motivologs.com/reset-password/${token}`;

    const response = await resend.emails.send({
      from: "Motivo Logs Support <no-reply@motivologs.com>",
      to: [email],
      subject: "Reset Your Motivo Logs Password",
      html: `
        <div
          style="
            background-color:#f3f6f5;
            padding:40px 0;
            font-family:Arial,Helvetica,sans-serif;
          "
        >

          <table
            align="center"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width:600px;
              background:#ffffff;
              border-radius:8px;
              overflow:hidden;
            "
          >

            <!-- Header -->
            <tr>
              <td
                style="
                  padding:30px;
                  text-align:center;
                  background:#001E2B;
                "
              >
                <img
                  src="https://motivologs.com/images/logo.png"
                  alt="Motivo Logs"
                  width="160"
                  style="
                    display:block;
                    margin:0 auto;
                    max-width:160px;
                    height:auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                  "
                />
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:40px 30px;">

                <h2
                  style="
                    margin:0 0 20px 0;
                    color:#001E2B;
                    font-size:22px;
                    line-height:1.3;
                    font-weight:700;
                  "
                >
                  Reset Your Password
                </h2>

                <p
                  style="
                    margin:0 0 16px 0;
                    color:#374151;
                    font-size:15px;
                    line-height:1.6;
                  "
                >
                  Hello ${firstName || "there"},
                </p>

                <p
                  style="
                    margin:0 0 16px 0;
                    color:#374151;
                    font-size:15px;
                    line-height:1.6;
                  "
                >
                  We received a request to reset the password
                  for your Motivo Logs account.
                </p>

                <p
                  style="
                    margin:0;
                    color:#374151;
                    font-size:15px;
                    line-height:1.6;
                  "
                >
                  Click the button below to create a new password.
                </p>

                <!-- Button -->
                <div
                  style="
                    margin:30px 0;
                    text-align:center;
                  "
                >
                  <a
                    href="${resetUrl}"
                    style="
                      display:inline-block;
                      background:#197d3f;
                      color:#ffffff;
                      text-decoration:none;
                      padding:14px 28px;
                      border-radius:7px;
                      font-size:15px;
                      font-weight:600;
                      line-height:1;
                    "
                  >
                    Reset Password
                  </a>
                </div>

                <p
                  style="
                    margin:0 0 16px 0;
                    color:#6b7280;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  This password reset link will expire in 1 hour.
                </p>

                <p
                  style="
                    margin:0;
                    color:#6b7280;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  If you did not request a password reset,
                  you can safely ignore this email. Your password
                  will remain unchanged.
                </p>

                <!-- Fallback Link -->
                <p
                  style="
                    margin:30px 0 0 0;
                    color:#9ca3af;
                    font-size:12px;
                    line-height:1.5;
                    word-break:break-all;
                  "
                >
                  If the button doesn't work, copy and paste this
                  link into your browser:
                  <br />
                  <a
                    href="${resetUrl}"
                    style="
                      color:#197d3f;
                      text-decoration:none;
                    "
                  >
                    ${resetUrl}
                  </a>
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="
                  padding:20px 30px;
                  text-align:center;
                  font-size:12px;
                  color:#6b7280;
                  border-top:1px solid #e5e7eb;
                "
              >
                © ${new Date().getFullYear()}
                Motivo Logs. All rights reserved.
              </td>
            </tr>

          </table>

        </div>
      `,
    });

    console.log("RESEND RESPONSE:", response);

    return response;
  } catch (error) {
    console.error("RESEND ERROR:", error);

    throw error;
  }
}

module.exports = sendForgotPasswordMail;
