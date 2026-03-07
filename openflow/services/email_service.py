"""Email service — SMTP with console fallback for dev."""

import logging
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from openflow.config import get_settings

logger = logging.getLogger(__name__)


def _send_smtp(to: str, subject: str, html: str) -> None:
    settings = get_settings()
    assert settings.smtp_host is not None
    assert settings.smtp_user is not None
    assert settings.smtp_password is not None
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, [to], msg.as_string())


def _send(to: str, subject: str, html: str, user_id: str) -> None:
    """Send email — fire-and-forget in background thread."""
    settings = get_settings()

    if not settings.smtp_host:
        # Dev fallback: print to console
        print(f"\n[EMAIL] To: {to}\n[EMAIL] Subject: {subject}\n{html}\n")
        logger.info(
            "email printed to console (no SMTP configured)", extra={"user_id": user_id}
        )
        return

    def _worker():
        try:
            _send_smtp(to, subject, html)
            logger.info("email sent", extra={"user_id": user_id})
        except Exception:
            logger.exception("email send failed", extra={"user_id": user_id})

    threading.Thread(target=_worker, daemon=True).start()


def send_verification_email(to: str, token: str, base_url: str, user_id: str) -> None:
    link = f"{base_url}/auth/verify-email?token={token}"
    html = f"""
    <p>Thanks for signing up for OpenFlow!</p>
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href="{link}">{link}</a></p>
    <p>This link expires in 24 hours.</p>
    """
    _send(to, "Verify your OpenFlow email", html, user_id)


def send_password_reset_email(to: str, token: str, base_url: str, user_id: str) -> None:
    link = f"{base_url}/auth/reset-password?token={token}"
    html = f"""
    <p>You requested a password reset for your OpenFlow account.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="{link}">{link}</a></p>
    <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    """
    _send(to, "Reset your OpenFlow password", html, user_id)
