"""
Email Service - Send professional emails for interviews and notifications

Features:
- Send interview invitations with Meet links
- Professional HTML email templates
- SMTP configuration from environment
- Error handling with 200 status codes
"""

import logging
import os
import smtplib
import urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

from repositories.email_repository import EmailRepository

logger = logging.getLogger(__name__)


class EmailService:
    """Service for email-related operations"""
    
    def __init__(self):
        self.email_repo = EmailRepository()
        
        # SMTP Configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.sender_email = os.getenv('SENDER_EMAIL', self.smtp_username)
        
        logger.info("📧 Email Service initialized")
        logger.info(f"📮 SMTP Server: {self.smtp_server}:{self.smtp_port}")
        logger.info(f"📨 Sender Email: {self.sender_email}")
    
    def send_interview_invitation(
        self,
        to_email: str,
        candidate_name: str,
        job_title: str,
        meet_link: str,
        scheduled_datetime: datetime,
        duration_minutes: int,
        interview_id: str,
        auto_start_bot: bool = True,
        auto_join_token: str = None,
        backend_url: str = "http://localhost:8001",
        hr_email: Optional[str] = None,
        interview_type: str = "ai_assisted"
    ) -> Dict[str, Any]:
        """
        Send interview invitation email to Candidate with attached .ics calendar invite
        and universal Google Calendar link based on interview_type:
        - human: Primary link is Google Meet (meet_link)
        - technical: Primary link is Technical AI Assessment Room (portal_link)
        - ai_assisted: Primary link is AI Interview Room (portal_link)
        """
        logger.info(f"📧 Preparing interview invitation email ({interview_type}) for candidate: {to_email}")
        
        try:
            # Validate SMTP credentials
            if not self.smtp_username or not self.smtp_password:
                error_msg = "SMTP credentials not configured"
                logger.error(f"❌ {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "message": "Email service not configured"
                }
            
            # Format datetime
            formatted_datetime = scheduled_datetime.strftime('%B %d, %Y at %I:%M %p UTC')
            
            # Universal Google Calendar Link
            start_utc = scheduled_datetime if scheduled_datetime.tzinfo else scheduled_datetime.replace(tzinfo=timezone.utc)
            end_utc = start_utc + timedelta(minutes=duration_minutes)
            start_iso = start_utc.strftime('%Y%m%dT%H%M%SZ')
            end_iso = end_utc.strftime('%Y%m%dT%H%M%SZ')
            
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            portal_link = f"{frontend_url}/interactive-interview?id={interview_id}"
            
            # Determine type-specific configurations
            itype = (interview_type or "ai_assisted").lower()
            
            if itype == "human":
                # Human Recruiter video call via Google Meet
                primary_link = meet_link or portal_link
                subject = f"👤 Interview Invitation: {job_title} - {candidate_name} (Google Meet)"
                header_title = "👤 Interview Invitation"
                header_subtitle = "1-on-1 Video Interview with Hiring Team"
                header_gradient = "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)"
                format_name = "Live Video Interview via Google Meet"
                primary_button_label = "🎥 Join Google Meet Video Call"
                primary_button_color = "#2563eb"
                calendar_summary = f"Interview: {job_title} - {candidate_name} (Google Meet)"
                
                instructions_html = f"""
                    <li>Click <strong>"Join Google Meet Video Call"</strong> at the scheduled time to connect directly with your interviewer.</li>
                    <li>Ensure you are in a quiet room with a working <strong>camera, microphone</strong>, and stable internet.</li>
                    <li>Meeting link: <a href="{primary_link}" style="color: #0284c7; font-weight: bold;">{primary_link}</a></li>
                    <li>Please join 5 minutes before the scheduled time.</li>
                """
                instructions_text = f"""• Join Google Meet link at scheduled time: {primary_link}
• Ensure camera & microphone are working properly.
• Please connect 5 minutes prior to scheduled time."""

            elif itype == "technical":
                # Technical coding & AI assessment
                primary_link = portal_link
                subject = f"💻 Technical Assessment Invitation: {job_title} - {candidate_name}"
                header_title = "💻 Technical Assessment Invitation"
                header_subtitle = "AI-Powered Technical Assessment & Evaluation"
                header_gradient = "linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)"
                format_name = "Interactive Technical Assessment (AI-Powered)"
                primary_button_label = "💻 Start Technical AI Assessment"
                primary_button_color = "#7c3aed"
                calendar_summary = f"Technical Assessment: {job_title} - {candidate_name}"
                
                instructions_html = f"""
                    <li>Click <strong>"Start Technical AI Assessment"</strong> button above when you are ready to begin.</li>
                    <li>The AI assessment platform will test your domain skills, problem-solving abilities, and technical concepts.</li>
                    <li>We recommend using a <strong>desktop/laptop computer</strong> with Chrome/Firefox and a functioning microphone.</li>
                    <li>Please begin 5 minutes before or exactly at the scheduled time.</li>
                """
                instructions_text = f"""• Click Start Technical AI Assessment when ready: {primary_link}
• The platform will evaluate your technical proficiency & coding concepts.
• Use a laptop/desktop with a stable internet connection."""

            else:
                # ai_assisted / default
                primary_link = portal_link
                subject = f"🤖 Interview Invitation: {job_title} - {candidate_name}"
                header_title = "🤖 Interview Invitation"
                header_subtitle = "Live AI Avatar Interactive Recruiter Platform"
                header_gradient = "linear-gradient(135deg, #059669 0%, #10b981 50%, #14b8a6 100%)"
                format_name = "Live AI Interactive Voice & Video Interview"
                primary_button_label = "🚀 Start AI Interview Room"
                primary_button_color = "#10b981"
                calendar_summary = f"AI Interview: {job_title} - {candidate_name}"
                
                instructions_html = f"""
                    <li>Click <strong>"Start AI Interview Room"</strong> button above when ready to begin.</li>
                    <li>The AI interviewer bot will greet you and guide you step-by-step through the questions.</li>
                    <li>Ensure you have a <strong>stable internet connection</strong> and a functioning <strong>microphone</strong>.</li>
                    <li>Please join 5 minutes before the scheduled time.</li>
                """
                instructions_text = f"""• Click Start AI Interview Room when ready: {primary_link}
• The AI interviewer bot will guide you through the questions.
• Ensure microphone is working and join 5 minutes prior."""

            encoded_title = urllib.parse.quote(calendar_summary)
            encoded_desc = urllib.parse.quote(
                f"{format_name}\n\n"
                f"Candidate: {candidate_name}\n"
                f"Position: {job_title}\n"
                f"Interview ID: {interview_id}\n\n"
                f"Direct Join Link: {primary_link}\n"
            )
            encoded_loc = urllib.parse.quote(primary_link)
            google_cal_link = f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={encoded_title}&dates={start_iso}/{end_iso}&details={encoded_desc}&location={encoded_loc}"
            
            # iCalendar (.ics) content for native calendar integration in Gmail, Outlook, Apple Mail
            now_iso = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Recruiter Platform//Interview Scheduler//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{interview_id}@airecruiter.com
DTSTAMP:{now_iso}
DTSTART:{start_iso}
DTEND:{end_iso}
SUMMARY:{calendar_summary}
DESCRIPTION:{format_name}\\nCandidate: {candidate_name}\\nInterview ID: {interview_id}\\nJoin Link: {primary_link}
LOCATION:{primary_link}
ORGANIZER;CN=AI Recruiter:mailto:{self.sender_email}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN={candidate_name}:mailto:{to_email}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR""".replace('\n', '\r\n')
            
            # HTML email body
            html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f6f9; }}
        .container {{ max-width: 620px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
        .header {{ background: {header_gradient}; color: white; padding: 32px 24px; text-align: center; }}
        .content {{ padding: 32px 28px; }}
        .info-box {{ background: #f8fafc; padding: 20px; margin: 20px 0; border-left: 4px solid #0ea5e9; border-radius: 6px; }}
        .btn-container {{ text-align: center; margin: 28px 0; }}
        .button {{ display: inline-block; padding: 14px 28px; background: {primary_button_color}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 6px; }}
        .cal-button {{ display: inline-block; padding: 14px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 6px; }}
        .cal-box {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 14px; color: #1e40af; }}
        .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }}
        .highlight {{ color: #0284c7; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 26px;">{header_title}</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 15px;">{header_subtitle}</p>
        </div>
        <div class="content">
            <p>Dear <strong>{candidate_name}</strong>,</p>
            
            <p>Congratulations! You have been selected for an interview for the position of <span class="highlight">{job_title}</span>.</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #0f172a;">📅 Interview Schedule</h3>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li><strong>Candidate Email:</strong> {to_email}</li>
                    <li><strong>Date & Time:</strong> {formatted_datetime}</li>
                    <li><strong>Duration:</strong> {duration_minutes} minutes</li>
                    <li><strong>Interview Format:</strong> {format_name}</li>
                    <li><strong>Interview ID:</strong> {interview_id}</li>
                </ul>
            </div>
            
            <div class="btn-container">
                <a href="{primary_link}" class="button">{primary_button_label}</a>
                <br>
                <a href="{google_cal_link}" target="_blank" class="cal-button">📅 Add to My Google Calendar</a>
            </div>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #0f172a;">📌 Important Instructions</h3>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                    {instructions_html}
                </ul>
            </div>
            
            <p>Best of luck with your interview! 🍀</p>
            <p style="margin-bottom: 0;">Best Regards,<br><strong>Talent Acquisition & HR Team</strong></p>
        </div>
        <div class="footer">
            <p style="margin: 0 0 6px 0;">This email was sent to {to_email} for Interview ID: {interview_id}.</p>
            <p style="margin: 0;">Automated Recruitment System • Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
            """
            
            # Plain text fallback
            text_body = f"""Dear {candidate_name},

Congratulations! You have been selected for an interview for the position of {job_title}.

INTERVIEW DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recipient: {to_email}
Date & Time: {formatted_datetime}
Duration: {duration_minutes} minutes
Interview Format: {format_name}
Interview ID: {interview_id}

JOIN LINK:
{primary_link}

ADD TO GOOGLE CALENDAR:
{google_cal_link}

IMPORTANT NOTES:
{instructions_text}

Best of luck!
HR Team
            """
            
            # Create multipart/mixed message to support both HTML and .ics calendar invite
            msg = MIMEMultipart('mixed')
            msg['From'] = f"AI Recruiter <{self.sender_email}>"
            msg['To'] = to_email
            if hr_email and '@' in hr_email and hr_email != 'hr@company.com':
                msg['Reply-To'] = hr_email
            msg['Subject'] = subject
            
            # Inner multipart/alternative for text and html
            msg_alt = MIMEMultipart('alternative')
            msg_alt.attach(MIMEText(text_body, 'plain', 'utf-8'))
            msg_alt.attach(MIMEText(html_body, 'html', 'utf-8'))
            
            # Attach calendar part for Gmail/Outlook inline RSVP parsing
            part_cal_inline = MIMEText(ics_content, 'calendar; method=REQUEST; charset="UTF-8"')
            part_cal_inline.add_header('Content-Disposition', 'inline; filename="invite.ics"')
            msg_alt.attach(part_cal_inline)
            
            msg.attach(msg_alt)
            
            # Also attach .ics file for mail clients that expect it as an attachment
            part_file = MIMEBase('text', 'calendar', name='invite.ics')
            part_file.set_payload(ics_content.encode('utf-8'))
            encoders.encode_base64(part_file)
            part_file.add_header('Content-Disposition', 'attachment; filename="invite.ics"')
            msg.attach(part_file)
            
            # Send email
            logger.info(f"📤 Connecting to SMTP server: {self.smtp_server}:{self.smtp_port}")
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                logger.info("🔐 Logging in to SMTP server...")
                server.login(self.smtp_username, self.smtp_password)
                
                logger.info(f"📨 Sending email with calendar invite to {to_email}...")
                server.send_message(msg)
            
            logger.info(f"✅ Interview invitation + calendar invite sent successfully to candidate: {to_email}")
            
            # Log email in MongoDB
            try:
                self.email_repo.log_email(
                    recipient_email=to_email,
                    recipient_name=candidate_name,
                    subject=subject,
                    body=text_body,
                    email_type="interview_invitation",
                    interview_id=interview_id,
                    status="sent"
                )
                logger.info(f"💾 Email logged in MongoDB for {to_email}")
            except Exception as log_error:
                logger.warning(f"⚠️ Failed to log email in MongoDB: {str(log_error)}")
            
            return {
                "success": True,
                "message": f"Interview invitation and calendar invite sent to {to_email}",
                "details": {
                    "recipient": to_email,
                    "subject": subject,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "google_calendar_add_url": google_cal_link
                }
            }
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = "SMTP authentication failed. Check username/password."
            logger.error(f"❌ {error_msg}: {str(e)}")
            return {
                "success": False,
                "error": error_msg,
                "message": "Failed to authenticate with email server"
            }
            
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "message": "Failed to send email"
            }
            
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "message": "Email sending failed"
            }

    def send_hr_confirmation(
        self,
        hr_email: str,
        candidate_name: str,
        candidate_email: str,
        job_title: str,
        meet_link: str,
        scheduled_datetime: datetime,
        duration_minutes: int,
        interview_id: str,
        interview_type: str = "ai_assisted"
    ) -> Dict[str, Any]:
        """
        Send HR confirmation copy for scheduled interview.
        Explicitly distinguishes HR notification from candidate invitation and adapts
        links & instructions based on interview_type: human, technical, or ai_assisted.
        """
        logger.info(f"📧 Sending HR interview confirmation ({interview_type}) to {hr_email}")
        
        try:
            if not self.smtp_username or not self.smtp_password:
                return {"success": False, "error": "SMTP not configured"}
            
            formatted_datetime = scheduled_datetime.strftime('%B %d, %Y at %I:%M %p UTC')
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            portal_link = f"{frontend_url}/interactive-interview?id={interview_id}"
            
            itype = (interview_type or "ai_assisted").lower()
            
            if itype == "human":
                subject = f"📋 [HR Confirmation] Human Interview: {candidate_name} ({candidate_email}) - {job_title}"
                badge_text = "Human Recruiter Video Call"
                header_title = "Human Interview Confirmation"
                format_name = "Live Video Interview via Google Meet"
                action_button = f"""<a href="{meet_link}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    🎥 Join Google Meet as Interviewer
                </a>"""
                hr_note = f"You are set as the interviewer for this session. Please join the Google Meet call at the scheduled time to conduct the interview. Google Meet Link: <a href='{meet_link}'>{meet_link}</a>"
                text_join = f"INTERVIEWER GOOGLE MEET LINK:\n{meet_link}"
            elif itype == "technical":
                subject = f"📋 [HR Confirmation] Technical Assessment: {candidate_name} ({candidate_email}) - {job_title}"
                badge_text = "Technical Assessment"
                header_title = "Technical Assessment Confirmation"
                format_name = "Technical AI Assessment & Coding Evaluation"
                action_button = f"""<a href="{portal_link}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    💻 View Technical Assessment Room
                </a>"""
                hr_note = "The candidate will complete an interactive AI technical assessment. Evaluation metrics and scoring will be available upon completion."
                text_join = f"TECHNICAL ASSESSMENT ROOM:\n{portal_link}"
            else:
                subject = f"📋 [HR Confirmation] AI Interview: {candidate_name} ({candidate_email}) - {job_title}"
                badge_text = "AI Recruiter Copy"
                header_title = "AI Interview Confirmation"
                format_name = "Live AI Interactive Voice & Video Interview"
                action_button = f"""<a href="{portal_link}" style="display: inline-block; padding: 12px 24px; background: #0284c7; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    🔍 View Candidate Interview Room
                </a>"""
                hr_note = "The candidate will be interviewed by the AI Avatar Bot. Candidate invitation with direct room link has been dispatched."
                text_join = f"CANDIDATE INTERVIEW ROOM:\n{portal_link}"
            
            html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f6f9; }}
        .container {{ max-width: 620px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 28px 24px; text-align: center; }}
        .content {{ padding: 28px; }}
        .badge {{ display: inline-block; padding: 4px 12px; background: #38bdf8; color: #0f172a; border-radius: 9999px; font-weight: bold; font-size: 12px; text-transform: uppercase; }}
        .info-box {{ background: #f8fafc; padding: 20px; margin: 20px 0; border-left: 4px solid #38bdf8; border-radius: 6px; }}
        .footer {{ text-align: center; padding: 18px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="badge">{badge_text}</span>
            <h1 style="margin: 10px 0 0 0; font-size: 22px;">{header_title}</h1>
        </div>
        <div class="content">
            <p>Hello HR Team,</p>
            <p>{hr_note}</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #0f172a;">👤 Candidate & Interview Details</h3>
                <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li><strong>Candidate Name:</strong> {candidate_name}</li>
                    <li><strong>Candidate Email:</strong> <span style="color: #0284c7; font-weight: bold;">{candidate_email}</span> (Invitation Dispatched)</li>
                    <li><strong>Position:</strong> {job_title}</li>
                    <li><strong>Format:</strong> {format_name}</li>
                    <li><strong>Scheduled Time:</strong> {formatted_datetime}</li>
                    <li><strong>Duration:</strong> {duration_minutes} minutes</li>
                    <li><strong>Interview ID:</strong> {interview_id}</li>
                </ul>
            </div>
            
            <p style="text-align: center; margin: 24px 0;">
                {action_button}
            </p>
        </div>
        <div class="footer">
            <p style="margin: 0;">Automated Recruiter Notification • System generated for HR: {hr_email}</p>
        </div>
    </div>
</body>
</html>
            """
            
            text_body = f"""[HR CONFIRMATION] Interview Scheduled ({badge_text})

Candidate: {candidate_name}
Candidate Email: {candidate_email}
Position: {job_title}
Format: {format_name}
Scheduled Time: {formatted_datetime}
Duration: {duration_minutes} mins
Interview ID: {interview_id}

{text_join}

The invitation and calendar invite have been delivered to candidate: {candidate_email}.
            """
            
            msg = MIMEMultipart('alternative')
            msg['From'] = self.sender_email
            msg['To'] = hr_email
            msg['Subject'] = subject
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"✅ HR confirmation copy sent to: {hr_email}")
            return {"success": True, "message": f"HR confirmation sent to {hr_email}"}
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to send HR confirmation email: {str(e)}")
            return {"success": False, "error": str(e)}
