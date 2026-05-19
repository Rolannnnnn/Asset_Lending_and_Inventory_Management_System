def declined_borrow_html(subject: str, body: str):
    return f"""
    <html>
        <body style="margin: 0; padding: 20px; background-color: #f4f7f6; font-family: Arial, Helvetica, sans-serif;">
            
            <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <div style="padding: 24px; border-bottom: 2px solid #eef2f3;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: #2c3e50; margin: 0; padding-bottom: 10px; text-align: center;">
                        {subject}
                    </h2>
                </div>
                
                <div style="padding: 24px;">
                    <p style="font-size: 1rem; color: #546e7a; margin-bottom: 20px;">
                        {body}
                    </p>
                </div>

                <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #eee; text-align: center;">
                    <p style="font-size: 11px; color: #999; margin: 0;">
                        This is an automated message from MIS Concern Tracking System<br>
                        If you did not make this ticket please ignore this email
                    </p>
                </div>
            </div>
        </body>
    </html>
    """