import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText

from app.dataclass import ErrorLog, AppError

import app.email.email_html as html
import app.general_checker as check

from app.dataclass import AppError, ErrorLog

load_dotenv()

def get_email_credentials():
    email = os.getenv("EMAIL_EMAIL")
    password = os.getenv("EMAIL_PASSWORD")

    if not email or not password:
        raise ValueError("Email credentials not set in environment variables")

    return email, password

def send_email_decline(name: str, to_email: str, borrow: bool):
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[name, to_email], bools=[borrow])
        if strict == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty or invalid."
            ))
        elif strict == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty."
            ))
        elif strict == 4:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some boolean fields are empty."
            ))

        if borrow:
            msg = MIMEText(html.declined_borrow_html(name=name), "html")
            msg["Subject"] = "Borrow Request Declined"
        else:
            msg = MIMEText(html.declined_issuance_html(name=name), "html")
            msg["Subject"] = "Issuance Request Declined"                                         
        msg["From"] = "Students Affairs Services"
        msg["To"] = to_email

        email, password = get_email_credentials()

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(email, password)
            server.send_message(msg)    
        return 0, None
    
    except smtplib.SMTPAuthenticationError:
        print("Email Authentication Error")
        return None, ErrorLog(
            subject="Email Authentication Error",
            message="There is a problem authenticating the system email.",
            func="send_email_survey",
            module="email"
        )
    except smtplib.SMTPConnectError:
        print("Connection Error")
        return None, ErrorLog(
            subject="Connection Error",
            message="Cannot establish connection to SMTP server.",
            func="send_email_survey",
            module="email"
        )
    except smtplib.SMTPRecipientsRefused:
        print("Employee Email Refused")
        return None, ErrorLog(
            subject="Employee Email Refused",
            message="The email connected to this employee rejected the confirmation email.",
            func="send_email_survey",
            module="email"
        )
    except smtplib.SMTPException as e:
        print(f"SMTP Error: {str(e)}")
        return None, ErrorLog(
            subject="Email Error",
            message=f"SMTP Error: {str(e)}",
            func="send_email_survey",
            module="email"
        )
    except AppError as a:
        a.log.func, a.log.module = "send_email_no_survey", "email"
        print(a.log)
        raise
    except Exception as e:
        print(f"System Error: {str(e)}")
        return None, ErrorLog(
            subject="System Error",
            message=f"System Error: {str(e)}",
            func="send_email_survey",
            module="email"
        )
    
def send_email_accept(name: str, to_email: str):
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[name, to_email])
        if strict == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty or invalid."
            ))
        elif strict == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty."
            ))
        elif strict == 4:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some boolean fields are empty."
            ))

        msg = MIMEText(html.accepted_html(name=name), "html")
        msg["Subject"] = "Borrow Request Approved"                                         
        msg["From"] = "Students Affairs Services"
        msg["To"] = to_email

        email, password = get_email_credentials()

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(email, password)
            server.send_message(msg)    
        return 0, None
    
    except smtplib.SMTPAuthenticationError:
        print("Email Authentication Error")
        return None, ErrorLog(
            subject="Email Authentication Error",
            message="There is a problem authenticating the system email.",
            func="send_email_survey",
            module="email"
        )
    except smtplib.SMTPConnectError:
        print("Connection Error")
        return None, ErrorLog(
            subject="Connection Error",
            message="Cannot establish connection to SMTP server.",
            func="send_email_survey",
            module="email"
        )
    except smtplib.SMTPRecipientsRefused:
        print("Employee Email Refused")
        return None, ErrorLog(
            subject="Employee Email Refused",
            message="The email connected to this employee rejected the confirmation email.",
            func="send_email_survey",
            module="email"
        )
    except smtplib.SMTPException as e:
        print(f"SMTP Error: {str(e)}")
        return None, ErrorLog(
            subject="Email Error",
            message=f"SMTP Error: {str(e)}",
            func="send_email_survey",
            module="email"
        )
    except AppError as a:
        a.log.func, a.log.module = "send_email_no_survey", "email"
        print(a.log)
        raise
    except Exception as e:
        print(f"System Error: {str(e)}")
        return None, ErrorLog(
            subject="System Error",
            message=f"System Error: {str(e)}",
            func="send_email_survey",
            module="email"
        )