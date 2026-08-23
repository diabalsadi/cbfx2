import html
import os
import smtplib
from email.message import EmailMessage

from app.utils.otp import OTP_TTL_MINUTES

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SYSTEM_EMAIL_ID")
SMTP_PASSWORD = os.getenv("SYSTEM_EMAIL_PASSWORD")

SITE_NAME = "CBFX"
BRAND_COLOR = "#f97316"


def send_email(to: str, subject: str, html_body: str) -> None:
    if not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError(
            "SYSTEM_EMAIL_ID / SYSTEM_EMAIL_PASSWORD environment variables are required to send email"
        )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{SITE_NAME} <{SMTP_USER}>"
    msg["To"] = to
    msg.set_content("Your email client doesn't support HTML email.")
    msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


def send_otp_email(to: str, name: str, code: str) -> None:
    # name is free-form user input (first name from the signup form) — must
    # be escaped before landing in an HTML email body, otherwise the app's
    # own trusted sending identity could be used to deliver attacker-chosen
    # markup/links to whatever address /auth/register targets.
    safe_name = html.escape(name)
    body = f"""
    <div style="background:#0f0f0f;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:420px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;
                  border-radius:18px;padding:36px 28px;text-align:center;">
        <div style="font-size:24px;font-weight:800;letter-spacing:0.5px;color:#ffffff;margin-bottom:24px;">
          {SITE_NAME}
        </div>
        <h1 style="font-size:19px;color:#ffffff;margin:0 0 8px;">Welcome, {safe_name}!</h1>
        <p style="font-size:14px;color:#9a9a9a;margin:0 0 24px;line-height:1.5;">
          Use this code to verify your email and finish creating your {SITE_NAME} account.
        </p>
        <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:{BRAND_COLOR};
                    background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;
                    padding:18px 12px;margin:0 0 20px;">
          {code}
        </div>
        <p style="font-size:13px;color:#777;margin:0;line-height:1.5;">
          This code expires in {OTP_TTL_MINUTES} minutes. If you didn't request it, you can
          safely ignore this email.
        </p>
      </div>
    </div>
    """
    send_email(to, f"Your {SITE_NAME} verification code", body)
