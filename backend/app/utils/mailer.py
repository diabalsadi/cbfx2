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
ADMIN_LOGIN_URL = "https://cbfx2.vercel.app/admin/login"


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

    # Port 465 is implicit TLS (the connection is SSL-wrapped from the first
    # byte, e.g. Zoho's smtppro.zoho.com) — everything else assumes STARTTLS
    # (a plaintext connection upgraded in-band, e.g. Gmail/Zoho's smtp.zoho.com
    # on 587). Using the wrong one for a given port fails the handshake.
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
    else:
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


def send_password_reset_otp_email(to: str, name: str, code: str) -> None:
    safe_name = html.escape(name) if name else "there"
    body = f"""
    <div style="background:#0f0f0f;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:420px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;
                  border-radius:18px;padding:36px 28px;text-align:center;">
        <div style="font-size:24px;font-weight:800;letter-spacing:0.5px;color:#ffffff;margin-bottom:24px;">
          {SITE_NAME}
        </div>
        <h1 style="font-size:19px;color:#ffffff;margin:0 0 8px;">Reset your password</h1>
        <p style="font-size:14px;color:#9a9a9a;margin:0 0 24px;line-height:1.5;">
          Hi {safe_name}, use this code to verify it's you and set a new password.
        </p>
        <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:{BRAND_COLOR};
                    background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;
                    padding:18px 12px;margin:0 0 20px;">
          {code}
        </div>
        <p style="font-size:13px;color:#777;margin:0;line-height:1.5;">
          This code expires in {OTP_TTL_MINUTES} minutes. If you didn't request a password
          reset, you can safely ignore this email — your password won't change.
        </p>
      </div>
    </div>
    """
    send_email(to, f"Reset your {SITE_NAME} password", body)


def send_new_credentials_email(to: str, name: str, temp_password: str) -> None:
    """A super_admin regenerated this account's password (see
    users.regenerate_password()) — the account holder never chose or saw the
    new password themselves, so it has to be delivered somewhere, and this is
    it. Recipient is required to set their own password on next login
    (see User.must_change_password)."""
    safe_name = html.escape(name) if name else "there"
    body = f"""
    <div style="background:#0f0f0f;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:420px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;
                  border-radius:18px;padding:36px 28px;text-align:center;">
        <div style="font-size:24px;font-weight:800;letter-spacing:0.5px;color:#ffffff;margin-bottom:24px;">
          {SITE_NAME}
        </div>
        <h1 style="font-size:19px;color:#ffffff;margin:0 0 8px;">Your password was reset</h1>
        <p style="font-size:14px;color:#9a9a9a;margin:0 0 24px;line-height:1.5;">
          Hi {safe_name}, an administrator regenerated the password for your account
          (<strong style="color:#ccc;">{html.escape(to)}</strong>). Use this temporary password
          to sign in — you'll be asked to set your own right away.
        </p>
        <div style="font-size:24px;font-weight:800;letter-spacing:2px;color:{BRAND_COLOR};
                    background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;
                    padding:18px 12px;margin:0 0 20px;word-break:break-all;">
          {html.escape(temp_password)}
        </div>
        <p style="font-size:13px;color:#777;margin:0;line-height:1.5;">
          If you didn't request this, contact an administrator immediately.
        </p>
      </div>
    </div>
    """
    send_email(to, f"Your new {SITE_NAME} admin password", body)


def send_broker_welcome_email(to: str, broker_name: str, temp_password: str) -> None:
    """A super_admin created a broker listing and linked it to a new broker-role
    login (see brokers.create_broker()) — the account holder never chose or saw
    the password themselves, so it has to be delivered somewhere, and this is
    it. Recipient is required to set their own password on next login (see
    User.must_change_password)."""
    safe_broker_name = html.escape(broker_name)
    body = f"""
    <div style="background:#0f0f0f;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:420px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;
                  border-radius:18px;padding:36px 28px;text-align:center;">
        <div style="font-size:24px;font-weight:800;letter-spacing:0.5px;color:#ffffff;margin-bottom:24px;">
          {SITE_NAME}
        </div>
        <h1 style="font-size:19px;color:#ffffff;margin:0 0 8px;">Welcome to {SITE_NAME}</h1>
        <p style="font-size:14px;color:#9a9a9a;margin:0 0 24px;line-height:1.5;">
          Your listing for <strong style="color:#ccc;">{safe_broker_name}</strong> is live. Use this
          temporary password to sign in at the admin portal — you'll be asked to set your own right
          away. From there you can manage your listing's details, cashback rates, and offer page.
        </p>
        <div style="font-size:24px;font-weight:800;letter-spacing:2px;color:{BRAND_COLOR};
                    background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;
                    padding:18px 12px;margin:0 0 20px;word-break:break-all;">
          {html.escape(temp_password)}
        </div>
        <p style="font-size:13px;color:#777;margin:0;line-height:1.5;">
          Sign in with this email address (<strong style="color:#ccc;">{html.escape(to)}</strong>).
          If you weren't expecting this, contact an administrator.
        </p>
      </div>
    </div>
    """
    send_email(to, f"Welcome to {SITE_NAME} — your broker account is ready", body)


def _brand_header() -> str:
    return f"""
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px;">
          <div style="width:36px;height:36px;border-radius:10px;background:{BRAND_COLOR};
                      display:flex;align-items:center;justify-content:center;
                      font-size:15px;font-weight:800;color:#0f0f0f;">CB</div>
          <span style="font-size:22px;font-weight:800;letter-spacing:0.5px;color:#ffffff;">{SITE_NAME}</span>
        </div>
    """


def _account_welcome_body(to: str, name: str, temp_password: str, role_title: str, intro: str) -> str:
    # to/name/temp_password all land in an HTML body sent from the app's
    # trusted identity, so each needs escaping (see send_otp_email) — name
    # and temp_password are admin-supplied free text, and to is the address
    # the mail is delivered to but still gets echoed back into the markup.
    safe_name = html.escape(name) if name else "there"
    return f"""
    <div style="background:#0f0f0f;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:460px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;
                  border-radius:18px;padding:36px 28px;text-align:center;">
        {_brand_header()}
        <h1 style="font-size:19px;color:#ffffff;margin:0 0 8px;">Welcome, {safe_name}!</h1>
        <p style="font-size:14px;color:#9a9a9a;margin:0 0 20px;line-height:1.5;">
          An administrator created a {role_title} account for you on {SITE_NAME}. {intro}
        </p>
        <p style="font-size:13px;color:#ccc;margin:0 0 4px;">Sign-in email</p>
        <p style="font-size:14px;color:#fff;margin:0 0 20px;font-weight:600;word-break:break-all;">
          {html.escape(to)}
        </p>
        <p style="font-size:13px;color:#ccc;margin:0 0 4px;">Temporary password</p>
        <div style="font-size:22px;font-weight:800;letter-spacing:2px;color:{BRAND_COLOR};
                    background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;
                    padding:16px 12px;margin:0 0 20px;word-break:break-all;">
          {html.escape(temp_password)}
        </div>
        <a href="{ADMIN_LOGIN_URL}" style="display:inline-block;margin:0 0 20px;padding:12px 28px;
                  background:{BRAND_COLOR};color:#0f0f0f;font-weight:700;font-size:14px;
                  text-decoration:none;border-radius:10px;">
          Sign in to the admin portal
        </a>
        <p style="font-size:13px;color:#777;margin:0;line-height:1.5;">
          You'll be asked to set your own password right after signing in. If you weren't
          expecting this account, contact an administrator.
        </p>
      </div>
    </div>
    """


def send_super_admin_welcome_email(to: str, name: str, temp_password: str) -> None:
    """A super_admin created another super_admin account (see
    users.create_user()) — delivers the sign-in email/password since the new
    admin never chose it themselves. Recipient must set their own password
    on next login (see User.must_change_password)."""
    body = _account_welcome_body(
        to, name, temp_password, "Super Admin",
        "You have full access to the admin portal, including user management, broker listings, and site content.",
    )
    send_email(to, f"Welcome to {SITE_NAME} — your Super Admin account is ready", body)


def send_editor_welcome_email(to: str, name: str, temp_password: str) -> None:
    """A super_admin created an editor account (see users.create_user()) —
    delivers the sign-in email/password since the new editor never chose it
    themselves. Recipient must set their own password on next login (see
    User.must_change_password)."""
    body = _account_welcome_body(
        to, name, temp_password, "Editor",
        "You can manage articles, market analysis, and other site content from the admin portal.",
    )
    send_email(to, f"Welcome to {SITE_NAME} — your Editor account is ready", body)


def send_broker_account_welcome_email(to: str, name: str, temp_password: str) -> None:
    """A super_admin created a broker-role login directly from the users
    admin page (see users.create_user()) — distinct from
    send_broker_welcome_email(), which fires when a broker *listing* is
    created and linked to a new login instead. Recipient must set their own
    password on next login (see User.must_change_password)."""
    body = _account_welcome_body(
        to, name, temp_password, "Broker",
        "You can manage your broker listing, cashback offers, and reports from the admin portal.",
    )
    send_email(to, f"Welcome to {SITE_NAME} — your Broker account is ready", body)


def send_affiliate_welcome_email(to: str, name: str, temp_password: str) -> None:
    """A super_admin created a "client" role account directly (see
    users.create_user()) — the admin portal's user-facing label for this
    role is "Affiliate" since these accounts track referrals/cashback.
    Recipient must set their own password on next login (see
    User.must_change_password)."""
    body = _account_welcome_body(
        to, name, temp_password, "Affiliate",
        "You can track referrals and cashback earnings from your affiliate dashboard.",
    )
    send_email(to, f"Welcome to {SITE_NAME} — your Affiliate account is ready", body)
