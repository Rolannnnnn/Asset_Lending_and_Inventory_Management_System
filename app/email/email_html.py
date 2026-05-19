import os
from dotenv import load_dotenv

load_dotenv()

def get_hours():
    return int(os.getenv("EMAIL_SAS_PREP_TIME"))

def declined_borrow_html(name: str):
    return f"""
    <html>
        <body style="margin: 0; padding: 20px; background-color: #f4f7f6; font-family: Arial, Helvetica, sans-serif;">
            
            <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <div style="padding: 24px; border-bottom: 2px solid #eef2f3;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: #2c3e50; margin: 0; padding-bottom: 10px; text-align: center;">
                        Hello, {name}
                    </h2>
                </div>
                
                <div style="padding: 24px;">
                    <p style="font-size: 1rem; color: #546e7a; margin-bottom: 20px;">
                        Your borrow request have been denied by the Office of Student Affairs Services (OSAS). Please proceed to the OSAS to learn more. Thank you.
                    </p>
                </div>

                <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 11px; color: #999; margin: 0;">
                        This is an automated message from the SAS Digital Inventory System<br>
                        If you did not make this request please ignore this email
                    </p>
                </div>
            </div>
        </body>
    </html>
    """

def declined_issuance_html(name: str):
    return f"""
    <html>
        <body style="margin: 0; padding: 20px; background-color: #f4f7f6; font-family: Arial, Helvetica, sans-serif;">
            
            <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <div style="padding: 24px; border-bottom: 2px solid #eef2f3;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: #2c3e50; margin: 0; padding-bottom: 10px; text-align: center;">
                        Hello, {name}
                    </h2>
                </div>
                
                <div style="padding: 24px;">
                    <p style="font-size: 1rem; color: #546e7a; margin-bottom: 20px;">
                        Your issuance request for the item you want to borrow have been denied by the Property Management Services (PMS). Please proceed to the Office of Student Affairs Services (OSAS) to learn more. Thank you.
                    </p>
                </div>

                <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 11px; color: #999; margin: 0;">
                        This is an automated message from the SAS Digital Inventory System<br>
                        If you did not make this request please ignore this email
                    </p>
                </div>
            </div>
        </body>
    </html>
    """

def accepted_html(name: str):
    hours = get_hours()
    return f"""
    <html>
        <body style="margin: 0; padding: 20px; background-color: #f4f7f6; font-family: Arial, Helvetica, sans-serif;">
            
            <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <div style="padding: 24px; border-bottom: 2px solid #eef2f3;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: #2c3e50; margin: 0; padding-bottom: 10px; text-align: center;">
                        Hello, {name}
                    </h2>
                </div>
                
                <div style="padding: 24px;">
                    <p style="font-size: 1rem; color: #546e7a; margin-bottom: 20px;">
                        Your borrow request has been approved. The item you requested to borrow is currently being prepared for transfer. Please wait for {hours} hours and proceed to the Office of Student Affairs Services (OSAS). Thank you.
                    </p>
                </div>

                <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 11px; color: #999; margin: 0;">
                        This is an automated message from the SAS Digital Inventory System<br>
                        If you did not make this request please ignore this email
                    </p>
                </div>
            </div>
        </body>
    </html>
    """