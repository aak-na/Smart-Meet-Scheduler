// sendClientMailModule.js
require("dotenv").config();
const { google } = require("googleapis");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const validator = require("validator");
const Meeting = require("./models/Meeting");

const SMTP_FALLBACK = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE) === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
};
const fallbackTransporter = nodemailer.createTransport(SMTP_FALLBACK);

async function sendMailViaUtillOrNodemailer(to, subject, html) {
  if (
    typeof global.utill === "object" &&
    typeof global.utill.sendMail === "function"
  ) {
    try {
      const result = global.utill.sendMail(to, subject, html);
      if (result && typeof result.then === "function") return await result;
      return await new Promise((resolve, reject) => {
        try {
          global.utill.sendMail(to, subject, html, (err, info) => {
            if (err) return reject(err);
            resolve(info);
          });
        } catch (e) {
          return fallbackTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject,
            html,
          });
        }
      });
    } catch (err) {
      return fallbackTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      });
    }
  } else {
    return fallbackTransporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
  }
}

function getOAuth2Client() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oAuth2Client;
}

async function createGoogleMeetEvent({
  title,
  description,
  startISO,
  endISO,
  timezone = "Asia/Kolkata",
  attendees = [],
}) {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: title || "Meeting",
    description: description || "",
    start: { dateTime: startISO, timeZone: timezone },
    end: { dateTime: endISO, timeZone: timezone },
    attendees,
    conferenceData: { createRequest: { requestId: `meet-${uuidv4()}` } },
  };

  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_ORGANIZER_EMAIL,
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: "none",
  });

  return res.data;
}

function buildEmailHtml(
  meetUrl,
  organiserLinkFallback,
  clientName = "Customer",
) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Meeting Invitation</title>
</head>

<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width:620px; margin:40px auto; background:#ffffff; padding:32px; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <h2 style="margin-top:0; color:#111827;">Meeting Invitation</h2>

    <!-- Greeting -->
    <p style="font-size:16px; color:#374151;">
      Hello <strong>${clientName}</strong>,
    </p>

    <!-- Body -->
    <p style="font-size:15px; color:#4b5563; line-height:1.6;">
      You have been invited to attend a scheduled meeting. Please use the button below to join the meeting at the scheduled time.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center; margin:28px 0;">
      <a href="${meetUrl}" target="_blank"
         style="display:inline-block; padding:14px 26px; background-color:#2563eb; color:#ffffff; text-decoration:none; border-radius:6px; font-size:16px; font-weight:600;">
        Join Google Meet
      </a>
    </div>

    <!-- Fallback Link -->
    <p style="font-size:14px; color:#6b7280;">
      If the button above does not work, copy and paste the following link into your browser:
    </p>

    <p style="word-break:break-all; font-size:14px;">
      <a href="${meetUrl}" target="_blank" style="color:#2563eb;">
        ${meetUrl}
      </a>
    </p>

    <!-- Optional Landing Page -->
    <p style="font-size:14px; color:#6b7280;">
      You may also visit the meeting page:
      <a href="${organiserLinkFallback}" target="_blank" style="color:#2563eb;">
        ${organiserLinkFallback}
      </a>
    </p>

    <!-- Footer -->
    <hr style="margin:32px 0; border:none; border-top:1px solid #e5e7eb;">

    <p style="font-size:13px; color:#9ca3af;">
      This meeting was scheduled using an automated meeting system.
    </p>

    <p style="font-size:14px; color:#374151; margin-bottom:0;">
      Best regards,<br>
      <strong>MeetSync Team</strong>
    </p>

  </div>
</body>
</html>
`;
}

const sendClientMail = async (request, response) => {
  try {
    const mail = (request.body.mail || "").trim();
    if (!mail || !validator.isEmail(mail)) {
      return response
        .status(400)
        .json({ status: 400, message: "Invalid or missing mail" });
    }

    let startDateISO = request.body.startDateISO;
    if (!startDateISO)
      startDateISO = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    let endDateISO = request.body.endDateISO;
    if (!endDateISO) {
      const s = new Date(startDateISO);
      endDateISO = new Date(s.getTime() + 30 * 60 * 1000).toISOString();
    }

    const timezone = request.body.timezone || "Asia/Kolkata";
    const title = request.body.title || "Scheduled Meeting";
    const description =
      request.body.description || "Scheduled via Elite Lead Genx";
    const clientName = request.body.clientName || "Customer";
    const uniqid = request.body.uniqid || uuidv4();

    // create meeting
    const createdEvent = await createGoogleMeetEvent({
      title,
      description,
      startISO: startDateISO,
      endISO: endDateISO,
      timezone,
      attendees: [{ email: mail }],
    });

    let meetUrl = "";
    if (createdEvent.hangoutLink) meetUrl = createdEvent.hangoutLink;
    else if (
      createdEvent.conferenceData &&
      createdEvent.conferenceData.entryPoints
    ) {
      const ep = createdEvent.conferenceData.entryPoints.find((e) =>
        ["video", "more", "hangouts"].includes(e.entryPointType),
      );
      if (ep) meetUrl = ep.uri;
    }
    if (!meetUrl && createdEvent.htmlLink) meetUrl = createdEvent.htmlLink;
    if (!meetUrl) {
      console.warn("No meet url:", createdEvent);
      return response
        .status(500)
        .json({ status: 500, message: "Could not create Google Meet link" });
    }

    const organiserLanding = `http://localhost:3000/meeting-scheduler/${uniqid}`;
    const html = buildEmailHtml(meetUrl, organiserLanding, clientName);
    const subject = `${title} — Join Meeting`;

    // send email
    const mailResult = await sendMailViaUtillOrNodemailer(mail, subject, html);

    // persist meeting record
    const meetingDoc = new Meeting({
      mail,
      clientName,
      title,
      description,
      startDateISO,
      endDateISO,
      timezone,
      uniqid,
      meetUrl,
      eventId: createdEvent.id,
    });
    await meetingDoc.save();

    return response.status(200).json({
      status: 200,
      message: "Mail sent successfully",
      meetUrl,
      eventId: createdEvent.id,
      savedId: meetingDoc._id,
      mailResult,
    });
  } catch (err) {
    console.error("sendClientMail error:", err);
    return response
      .status(500)
      .json({ status: 500, message: err.message || err });
  }
};

module.exports = { sendClientMail };
