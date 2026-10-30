def compute_attendance_percentage(present_count, late_count, excused_count, total_sessions, late_as_attended=True, exclude_excused=True):
    """
    Computes attendance percentage according to institutional rules.
    - Present is always counted as attended.
    - Late is counted as attended if late_as_attended=True.
    - Excused is excluded from eligible denominator if exclude_excused=True.
    Returns (percentage_float, eligible_count, attended_count, status_label)
    """
    attended = present_count + (late_count if late_as_attended else 0)

    if exclude_excused:
        eligible = total_sessions - excused_count
    else:
        eligible = total_sessions

    if eligible <= 0:
        return None, 0, attended, "No Sessions"

    percentage = round((attended / eligible) * 100.0, 2)
    return percentage, eligible, attended, get_attendance_category(percentage)

def get_attendance_category(percentage, min_threshold=75.0, warning_threshold=80.0):
    """Returns 'Safe', 'Warning', or 'Defaulter'."""
    if percentage is None:
        return "N/A"
    if percentage >= warning_threshold:
        return "Safe"
    elif percentage >= min_threshold:
        return "Warning"
    else:
        return "Defaulter"
