import PDFDocument from "pdfkit";

const apiKey = process.env.BREVO_API_KEY || "";
const senderEmail = process.env.SMTP_USER || "";
const adminEmail = process.env.AD_EMAIL || "";
const url = process.env.BR_API_URL || "";

const generateReceiptPDF = (name: string, txData: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    let buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => {
      const result = Buffer.concat(buffers);
      resolve(result.toString("base64"));
    });
    doc.on("error", reject);

    doc.rect(0, 0, 595.28, 110).fill("#D97706");
    
    doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text("HERITAGE IN CODE", 56.69, 45);
    doc.fontSize(9).font("Helvetica").text("Official Payment Receipt", 56.69, 70);

    doc.fillColor("#6B7280").fontSize(10).font("Helvetica-Bold").text("To:", 56.69, 150);
    doc.fillColor("#1F2937").fontSize(10).font("Helvetica").text(name, 56.69, 165);
    doc.text(txData.payer_email || "N/A", 56.69, 178);

    doc.fillColor("#6B7280").fontSize(10).font("Helvetica-Bold").text("Receipt Details:", 380, 150);
    doc.fillColor("#1F2937").fontSize(10).font("Helvetica").text(`Receipt ID: ${txData.transaction_id}`, 380, 165);
    doc.text(`Date: ${new Date(txData.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' })}`, 380, 178);
    doc.text(`Status: Completed`, 380, 191);

    const tableTop = 240;
    doc.rect(56.69, tableTop, 481.89, 20).fill("#D97706");
    doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold").text("Description", 65, tableTop + 6);
    doc.text("Amount", 480, tableTop + 6, { align: "right", width: 50 });

    const rowY = tableTop + 30;
    const cat = (txData.variant || "").toUpperCase();
    let dynamicDesc = "";

    if (cat.includes("SUBSCRIPTION")) {
      dynamicDesc = "Subscription payment for premium access";
      if (txData.expiry_date) {
        dynamicDesc += ` (Valid until ${new Date(txData.expiry_date).toLocaleDateString("en-GB")})`;
      }
    } else if (cat.includes("HERITAGE")) {
      dynamicDesc = `Payment for Heritage track download: ${txData.track_title || "Digital Track"}`;
    } else if (cat.includes("FUSED") || cat.includes("FUSION")) {
      dynamicDesc = `Payment for Fused track download: ${txData.track_title || "Digital Track"}`;
    } else {
      dynamicDesc = `Digital purchase: ${txData.track_title || "General Item"}`;
    }

    doc.fillColor("#374151").fontSize(9).font("Helvetica").text(dynamicDesc, 65, rowY, { width: 350 });
    doc.font("Helvetica-Bold").text(`$${Number(txData.amount).toFixed(2)}`, 480, rowY, { align: "right", width: 50 });

    const finalY = rowY + 50; 
    doc.strokeColor("#E5E7EB").lineWidth(0.5).moveTo(350, finalY).lineTo(538.58, finalY).stroke();
    
    doc.fillColor("#D97706").fontSize(11).font("Helvetica-Bold").text("Total Paid", 350, finalY + 12);
    doc.text(`$${Number(txData.amount).toFixed(2)} USD`, 450, finalY + 12, { align: "right", width: 90 });

    doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica").text("Thank you for contributing to our cultural heritage collection.", 0, 793.70, { align: "center", width: 595.28 });
    doc.end();
  });
};

const sendBrevo = async (to: string, name: string, subject: string, html: string, attachment?: any) => {
  if (!to || to.trim() === "") {
    throw new Error("Target email address is undefined or empty.");
  }

  const body: any = {
    sender: { name: "Heritage in Code", email: senderEmail },
    to: [{ email: to, name: name || "User" }],
    subject,
    htmlContent: html
  };

  if (attachment) {
    body.attachment = [attachment];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "accept": "application/json", 
      "api-key": apiKey, 
      "content-type": "application/json" 
    },
    body: JSON.stringify(body)
  });

  const result = await res.json();
  if (!res.ok) throw new Error(`Email failed: ${result.message}`);
  return result;
};

export const sendReceiptEmail = async (email: string, name: string, txData: any) => {
  try {
    const pdfBase64 = await generateReceiptPDF(name, txData);
    
    const html = `
      <div style="font-family: Arial, sans-serif; color: #374151;">
        <h4 style="color: #D97706;">Payment Received</h4>
        <p>Hello ${name},</p>
        <p>Thank you for your payment. Your receipt for transaction <strong>${txData.transaction_id}</strong> is attached to this email.</p>
        <p>Best Regards,<br>Heritage in Code Team</p>
      </div>
    `;

    return await sendBrevo(email, name, `Payment Receipt: ${txData.transaction_id}`, html, {
      content: pdfBase64,
      name: `Receipt_${txData.transaction_id}.pdf`
    });
  } catch (e) {
    console.error("Receipt Mailer Error:", e);
  }
};

export const sendTrackApprovalEmail = async (email: string, name: string, trackTitle: string) => {
  try {
    return await sendBrevo(email, name, "Your Sound Track is Live!", `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h4 style="color: #059669;">Track Approved!</h4>
        <p>Hello <strong>${name || ''}</strong>,</p>
        <p>Great news! Your track <strong>"${trackTitle}"</strong> has been reviewed and approved.</p>
        <p>It is now publicly available in the <strong>Heritage Sounds Library</strong>.</p>
      </div>
    `);
  } catch (e) {
    console.error("Track Approval Mailer Error:", e);
  }
};

export const sendTrackRejectionEmail = async (email: string, name: string, trackTitle: string) => {
  try {
    return await sendBrevo(email, name, "Update regarding your track submission", `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h4 style="color: #D97706;">Submission Update</h4>
        <p>Hello <strong>${name || ''}</strong>,</p>
        <p>After reviewing your submission <strong>"${trackTitle}"</strong>, it has been rejected as it does not comply with our requirements.</p>
      </div>
    `);
  } catch (e) {
    console.error("Track Rejection Mailer Error:", e);
  }
};

const notifyAdminOfNewAccount = async (newUserName: string, newUserEmail: string) => {
  try {
    return await sendBrevo(adminEmail, "System Admin", "New Account Registration", `
      <p>Hello Admin,</p>
      <p>A new account has been created on Heritage in Code.</p>
      <p><strong>Name:</strong> ${newUserName}<br><strong>Email:</strong> ${newUserEmail}</p>
    `);
  } catch (e) {
    console.error("Admin Alert Error:", e);
  }
};

export const sendVerificationEmail = async (email: string, name: string, link: string) => {
  try {
    await sendBrevo(email, name, "Verify Email (No-Reply)", `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h4 style="color: #D97706;">Welcome, ${name}!</h4>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${link}" style="color: #D97706; font-weight: bold;">Click here to verify</a></p>
        <div style="margin-top: 20px; border-top: 1px solid #eee; pt: 10px;">
          <p style="font-size: 12px; color: #666;">If the link above doesn't work, copy and paste this URL into your browser:</p>
          <p style="font-size: 11px; word-break: break-all; color: #D97706;">${link}</p>
        </div>
      </div>`);
    await notifyAdminOfNewAccount(name, email);
  } catch (e) {
    console.error("Verification Mailer Error:", e);
    throw e;
  }
};

export const sendRoleUpdateEmail = async (email: string, name: string, newRole: string) => {
  try {
    return await sendBrevo(email, name, "Account Permission Updated", `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h4 style="color: #D97706;">Role Update Notification</h4>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your access level on <strong>Heritage in Code</strong> has been updated to <strong>${newRole}</strong>.</p>
      </div>`);
  } catch (e) {
    console.error("Role Update Mailer Error:", e);
    throw e;
  }
};

export const sendPasswordResetEmail = async (email: string, name: string, link: string) => {
  try {
    return await sendBrevo(email, name, "Reset Your Password", `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h4 style="color: #D97706;">Password Reset Request</h4>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <p><a href="${link}" style="color: #D97706; font-weight: bold;">Reset Password</a></p>
        <div style="margin-top: 20px; border-top: 1px solid #eee; pt: 10px;">
          <p style="font-size: 12px; color: #666;">If the link above doesn't work, copy and paste this URL into your browser:</p>
          <p style="font-size: 11px; word-break: break-all; color: #D97706;">${link}</p>
        </div>
        <p style="margin-top: 15px;">If you did not request this, please ignore this email.</p>
      </div>`);
  } catch (e) {
    console.error("Password Reset Mailer Error:", e);
    throw e;
  }
};