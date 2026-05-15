import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime as dt

from app.auth_helper import auth_account
from app.dependency import get_db_config
import app.general_checker as check

from PIL import Image, ImageDraw, ImageFont
import os, json

from app.dataclass import AppError, ErrorLog

from app.generation.fill import fill_sample

# When adding a form:
# Upload form and coordinate on folder generation
# Make class under generation/dataclass.py
# Make fill function (returning the class just made) under generation/fill.py
# Adjust the global variables FORM_ALLOWED and FORM_DICT

EXTENSION_ALLOWED = ["jpg", "png", "pdf"]
FORM_ALLOWED = ["SAMPLE"]

FORM_DICT: dict[str, list] = {
    "SAMPLE": ["sample.png", "sample.json", fill_sample]
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORT_FOLDER = os.path.join(BASE_DIR, "generated_forms")

# Based on the form, load the correct image, coordinates, and function
# Class member names and json names must match
def validate_and_gather(logged: int, transaction_id: int, form: str, extension: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[transaction_id], strings=[form, extension])
        if strict == 1:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some integer fields are empty or invalid."
            ))
        elif strict == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string parameters are of invalid type."
            ))
        elif strict == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string parameters are missing."
            ))
        
        if form not in FORM_ALLOWED:
            raise AppError(ErrorLog(
                subject="Invalid Form", message="The selected form is currently not supported."
            ))
        if extension not in EXTENSION_ALLOWED:
            raise AppError(ErrorLog(
                subject="Invalid Extension", message=f"Limit the extension type to {EXTENSION_ALLOWED}."
            ))
        
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN", "PMS", "SAS"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))
                cur.execute("""
                    SELECT 
                        t.*,
                        s.name AS student_name,
                        COALESCE(
                            (
                                SELECT jsonb_agg(
                                    to_jsonb(te) || jsonb_build_object('personnel_name', a.name)
                                )
                                FROM transaction_events te
                                LEFT JOIN accounts a ON te.personnel_id = a.id
                                WHERE te.transaction_id = t.id
                            ), 
                            '[]'::jsonb
                        ) as events,
                        COALESCE(
                            (SELECT json_agg(ts) FROM transaction_stocks ts WHERE ts.transaction_id = t.id), 
                            '[]'::json
                        ) as stocks
                    FROM transactions t
                    LEFT JOIN students s ON s.student_number = t.student_number
                    WHERE t.id = %s;            
                """, (transaction_id,))
                transaction = cur.fetchone()

                if not transaction:
                    raise AppError(ErrorLog(
                        subject="Transaction Not Found", 
                        message="The transaction selected is not found in the database.",
                    ))
                
                return transaction, None
    except AppError as a:
        if not a.log.func:
            a.log.func = "validate_and_gather"
        if not a.log.module:
            a.log.module = "generate"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="validate_and_gather", module="generate"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="validate_and_gather", module="generate"
        )
    finally:
        if conn:
            conn.close()

def generate_form(transaction: RealDictCursor, extension: str, form: str):
    try:
        files = FORM_DICT[form]
        data = files[2](transaction)

        # Declare Needed Files
        coords_path = os.path.join(os.path.dirname(__file__), 'coordinate', files[1])
        with open(coords_path, "r") as f:
            config = json.load(f)
        image_path = os.path.join(os.path.dirname(__file__), 'form', files[0])

        # Image Generation
        image = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(image)

        # Write
        for field_name, settings in config.items():
            text_value = getattr(data, field_name, None)
            if not text_value:
                continue
            box = settings['box']
            align = settings.get('align', 'left')
            draw_text_fitted(draw, str(text_value), box, align=align)

        # Save Image
        os.makedirs(EXPORT_FOLDER, exist_ok=True)
        filename = f"{form}_form_{transaction['id']}.{extension}"
        output_path = os.path.join(EXPORT_FOLDER, filename)

        if extension == "pdf":
            rgb_image = image.convert("RGB")
            rgb_image.save(output_path, format="PDF", resolution=100.0)
        else:
            image.save(output_path)

        return output_path, None
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem creating the report. Contact administrator",
            func="generate_form", module="generate"
        )

def draw_text_fitted(draw, text, box, align="left", max_fs=50):
    x1, y1, x2, y2 = box
    box_w, box_h = x2 - x1, y2 - y1
    
    # Shrink font until it fits
    for size in range(max_fs, 8, -1):
        font = ImageFont.truetype("arial.ttf", size)
        bbox = draw.textbbox((0, 0), text, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        
        if w <= box_w and h <= box_h:
            # Calculate alignment offset
            if align == "center":
                x = x1 + (box_w - w) / 2
            elif align == "right":
                x = x1 + (box_w - w)
            else: # left
                x = x1
            
            y = y1 + (box_h - h) / 2 # Vertical center
            draw.text((x, y), text, fill="black", font=font)
            return
        
    font = ImageFont.truetype("arial.ttf", 8)
    draw.text((x1, y1), text, fill="black", font=font)