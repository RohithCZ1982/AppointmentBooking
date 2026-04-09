"""WhatsApp Business API service for appointment notifications."""
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_confirmation(mobile: str, patient_name: str, appointment_datetime: str, doctor_name: str) -> bool:
    """Send appointment confirmation message. Returns True on success."""
    message = (
        f"Hello {patient_name},\n"
        f"Your appointment at DentEase Dental Clinic is confirmed.\n"
        f"Date & Time: {appointment_datetime}\n"
        f"Doctor: Dr. {doctor_name}\n"
        f"Please arrive 10 minutes early. Reply CANCEL to cancel."
    )
    return await _send(mobile, message)


async def send_reminder(mobile: str, patient_name: str, appointment_datetime: str) -> bool:
    """Send 2-hour reminder. Returns True on success."""
    message = (
        f"Reminder: Hello {patient_name},\n"
        f"You have an appointment at DentEase Dental Clinic in 2 hours.\n"
        f"Time: {appointment_datetime}\n"
        f"See you soon!"
    )
    return await _send(mobile, message)


async def _send(mobile: str, message: str) -> bool:
    if not settings.whatsapp_api_token:
        logger.warning("WhatsApp API token not configured; skipping message to %s", mobile)
        return False

    payload = {
        "messaging_product": "whatsapp",
        "to": mobile.lstrip("+"),
        "type": "text",
        "text": {"body": message},
    }
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_api_token}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.whatsapp_api_url}/{settings.whatsapp_phone_number_id}/messages",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            return True
    except Exception as exc:
        logger.error("WhatsApp send failed for %s: %s", mobile, exc)
        return False
