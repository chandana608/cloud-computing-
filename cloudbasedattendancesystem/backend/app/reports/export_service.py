import io
import csv
import logging

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logger.warning("ReportLab library not installed. PDF export will use formatted text fallback.")

def generate_csv_report(headers, rows, filename="attendance_report.csv"):
    """Generates an in-memory CSV file buffer."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    output.seek(0)
    return io.BytesIO(output.getvalue().encode("utf-8"))

def generate_pdf_report(title, subtitle, headers, rows, filename="attendance_report.pdf", landscape_mode=False):
    """Generates a professional academic PDF report buffer using ReportLab with fallback."""
    buffer = io.BytesIO()

    if not REPORTLAB_AVAILABLE:
        # Fallback: Text report representation
        content = f"{title}\n{subtitle}\n{'=' * 60}\n"
        content += "\t".join(headers) + "\n"
        content += "-" * 60 + "\n"
        for r in rows:
            content += "\t".join([str(c) if c is not None else "" for c in r]) + "\n"
        buffer.write(content.encode("utf-8"))
        buffer.seek(0)
        return buffer

    pagesize = landscape(letter) if landscape_mode else letter
    doc = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e293b"),
        alignment=1,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        alignment=1,
        spaceAfter=14
    )

    elements = [
        Paragraph(title, title_style),
        Paragraph(subtitle, subtitle_style),
        Spacer(1, 10)
    ]

    table_data = [headers]
    for r in rows:
        table_data.append([str(c) if c is not None else "" for c in r])

    t = Table(table_data, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
    ]))

    elements.append(t)
    doc.build(elements)
    buffer.seek(0)
    return buffer
