from email_validator import validate_email, EmailNotValidError
import phonenumbers
from typing import Type, Any

import os

# 0 - Good
# 1 - Syntax
# 2 - DNS Error
def check_details(email: str, contact_number: str = None):
    if contact_number is None:
        stripped_contact_number = None
    elif not contact_number.strip():
        stripped_contact_number = None
    else:
        stripped_contact_number = contact_number.strip()
    email = email.lower()

    email_conf = 0
    contact_conf = 0
    norm_email = email
    norm_contact_number = stripped_contact_number

    try:
        email_check = validate_email(email, check_deliverability=False)
        norm_email = email_check.normalized

        try:
            validate_email(email, check_deliverability=True)
        except EmailNotValidError:
            email_conf = 2

    except EmailNotValidError:
        email_conf = 1

    if stripped_contact_number is not None:
        try:
            parsed = phonenumbers.parse(stripped_contact_number, "PH")

            if not phonenumbers.is_valid_number(parsed):
                contact_conf = 1
            else:
                type = phonenumbers.number_type(parsed)
                if type == phonenumbers.PhoneNumberType.MOBILE:
                    norm_contact_number = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                else:
                    norm_contact_number = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
        except Exception:
            contact_conf = 1

    return [norm_email, norm_contact_number], [email_conf, contact_conf]

# 0 - Good
# 1 - None/Wrong Format Ints
# 2 - None/Wrong Format Strings
# 3 - Empty String
# 4 - None/Wrong Format Bools
def check_strict_parameters(ints: list[int] = None, strings: list[str] = None, bools: list[bool] = None):
    if strings == []:
        strings = None
    if ints == []:
        ints = None
    if bools == []:
        bools = None

    if ints is not None:
        if any(x is None or type(x) is not int for x in ints):
            return 1
    
    if strings is not None:
        if any(x is None or type(x) is not str for x in strings):
            return 2
        if any(not x.strip() for x in strings):
            return 3
    
    if bools is not None:
        if any(x is None or type(x) is not bool for x in bools):
            return 4

    return 0

# 0 - Good
# 1 - None/Wrong Format Ints
# 2 - None/Wrong Format Strings
# 4 - None/Wrong Format Bools
def check_nullable_parameters(ints: list[int] = None, strings: list[str] = None, bools: list[bool] = None):
    if strings == []:
        strings = None
    if ints == []:
        ints = None
    if bools == []:
        bools = None
        
    if ints is not None:
        for x in ints:
            if x is not None and type(x) is not int:
                return 1

    if strings is not None:
        for x in strings:
            if x is not None:
                if type(x) is not str:
                    return 2
                

    if bools is not None:
        for x in bools:
            if x is not None and type(x) is not bool:
                return 4    

    return 0

# 0 - Good
# 1 - None/Wrong Type
def check_class_parameter(class_type: Type, classes: list[Any]):
    if classes is None:
        return 0
        
    for item in classes:
        if item is None or not isinstance(item, class_type):
            return 1
            
    return 0

def strip_sn(sn: str):
    stripped = sn.strip()
    
    numerics = ''.join(char for char in stripped if char.isdigit())
    letters = ''.join(char for char in stripped if char.isalpha())
    
    if len(numerics) == 8 and len(letters) == 1:
        formatted = f"{numerics[:3]}-{numerics[3:]}{letters[0].upper()}"
        return formatted, True
    
    return numerics + letters, False

def to_absolute_path(base: str, relative_path: str):
    filename = os.path.basename(relative_path)
    return os.path.abspath(os.path.join(base, filename))

def access_static(path: str):
    filename = os.path.basename(path)
    return f"/static/{filename}"