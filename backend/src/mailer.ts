const apiKey = process.env.BREVO_API_KEY || "";
const senderEmail = process.env.SMTP_USER || "";
const adminEmail = process.env.AD_EMAIL || "";
const url = process.env.BR_API_URL || "";

const sendBrevo = async (to: string, name: string, subject: string, html: string) => {
  if (!to || to.trim() === "") {
    throw new Error("Target email address is undefined or empty.");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "accept": "application/json", 
      "api-key": apiKey, 
      "content-type": "application/json" 
    },
    body: JSON.stringify({
      sender: { name: "Heritage in Code", email: senderEmail },
      to: [{ email: to, name: name || "User" }],
      subject,
      htmlContent: html
    })
  });

  const result = await res.json();
  if (!res.ok) throw new Error(`Email failed: ${result.message}`);
  return result;
};

// --- New Function for Track Approval ---
export const sendTrackApprovalEmail = (email: string, name: string, trackTitle: string) => 
  sendBrevo(email, name, "Your Sound Track is Live!", `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #27AE60;">Track Approved!</h2>
      <p>Hello <strong>${name || ''}</strong>,</p>
      <p>Great news! Your track <strong>"${trackTitle}"</strong> has been reviewed and approved.</p>
      <p>It is now publicly available in the <strong>Heritage Sounds Library</strong> for everyone to explore.</p>
      <div style="margin: 25px 0; text-align: center;">
        <p style="font-size: 14px; color: #7f8c8d;">Thank you for contributing to our cultural heritage collection.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #bdc3c7;">This is an automated notification from Heritage in Code.</p>
    </div>
  `).catch(e => console.error("Track Approval Mailer Error:", e));

const notifyAdminOfNewAccount = (newUserName: string, newUserEmail: string) => 
  sendBrevo(adminEmail, "System Admin", "New Account Registration", `
    <p>Hello Admin,</p>
    <p>A new account has been created on Heritage in Code.</p>
    <p>
      <strong>Name:</strong> ${newUserName}<br>
      <strong>Email:</strong> ${newUserEmail}
    </p>
    <p>This is an automated notification.</p>
  `).catch(e => console.error("Admin Alert Error:", e));

export const sendVerificationEmail = async (email: string, name: string, link: string) => {
  try {
    await sendBrevo(email, name, "Verify Email (No-Reply)", `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome, ${name}!</h2>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${link}" style="color: #007bff; font-weight: bold;">Click here to verify</a></p>
        <hr /><p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${link}</p>
      </div>`);

    await notifyAdminOfNewAccount(name, email);
  } catch (e) {
    console.error("Verification Mailer Error:", e);
    throw e;
  }
};

export const sendRoleUpdateEmail = (email: string, name: string, newRole: string) => 
  sendBrevo(email, name, "Account Permission Updated", `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #E67E22;">Role Update Notification</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your access level on <strong>Heritage in Code</strong> has been updated.</p>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #e9ecef;">
        <span style="color: #6c757d; font-size: 10px; text-transform: uppercase;">New Assigned Role</span><br/>
        <span style="font-size: 20px; font-weight: bold; color: #2C3E50;">${newRole}</span>
      </div>
    </div>`).catch(e => { console.error("Role Update Mailer Error:", e); throw e; });