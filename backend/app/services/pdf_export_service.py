"""
PdfExportService - Generates PDF documents from PDC content in PRIA v7
Uses WeasyPrint or ReportLab for PDF generation
"""
from typing import Optional
from datetime import datetime
from app.models.pdc import PDC
from app.schemas.export import BrandingConfig

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


class PdfExportService:
    """Service for generating PDF exports from PDC content"""

    @staticmethod
    def export_pdc(
        pdc: PDC,
        branding: BrandingConfig,
        format_type: str = "detailed",
    ) -> bytes:
        """
        Generate a PDF document from PDC content with school branding.

        Args:
            pdc: PDC model instance with content
            branding: BrandingConfig with school branding details
            format_type: "simple" or "detailed"

        Returns:
            PDF file as bytes

        Raises:
            ImportError: If no PDF library is available
        """
        if not WEASYPRINT_AVAILABLE:
            raise ImportError(
                "WeasyPrint is not installed. "
                "Install it with: pip install weasyprint"
            )

        # Generate HTML content
        html_content = PdfExportService._generate_html(pdc, branding, format_type)

        # Generate CSS for branding
        css_content = PdfExportService._generate_css(branding)

        # Convert HTML to PDF using WeasyPrint
        try:
            html = HTML(string=html_content, base_url="/")
            css = CSS(string=css_content)
            pdf_bytes = html.write_pdf(stylesheets=[css])
            return pdf_bytes
        except Exception as e:
            raise RuntimeError(f"Failed to generate PDF: {str(e)}")

    @staticmethod
    def _generate_html(pdc: PDC, branding: BrandingConfig, format_type: str) -> str:
        """Generate HTML content for PDF"""
        hoje = datetime.utcnow().strftime("%d/%m/%Y")

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{pdc.title or 'PDC'}</title>
        </head>
        <body>
            <div class="header">
                <h1>{branding.school_name}</h1>
                <p class="date">Fecha: {hoje}</p>
            </div>

            <div class="content">
                <h2>{pdc.title or 'Plan de Desarrollo Curricular'}</h2>
                <p class="subtitle">{pdc.subject} - {pdc.grade_level}</p>

                {f'<p class="description">{pdc.description or ""}</p>' if pdc.description else ''}

                <h3>Información General</h3>
                <table class="info-table">
                    <tr>
                        <td class="label">Asignatura:</td>
                        <td>{pdc.subject or 'No definido'}</td>
                    </tr>
                    <tr>
                        <td class="label">Grado:</td>
                        <td>{pdc.grade_level or 'No definido'}</td>
                    </tr>
                    <tr>
                        <td class="label">Trimestre:</td>
                        <td>{pdc.trimester or 'No definido'}</td>
                    </tr>
                    <tr>
                        <td class="label">Año Escolar:</td>
                        <td>{pdc.school_year or 'No definido'}</td>
                    </tr>
                </table>

                <h3>Planificación MESCP</h3>
                <table class="mescp-table">
                    <thead>
                        <tr>
                            <th>Objetivo</th>
                            <th>Contenidos</th>
                            <th>Momentos</th>
                            <th>Recursos</th>
                            <th>Períodos</th>
                            <th>Criterios</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{pdc.objetivo or 'No definido'}</td>
                            <td>{pdc.contenidos or 'No definido'}</td>
                            <td>{pdc.momentos or 'No definido'}</td>
                            <td>{pdc.recursos or 'No definido'}</td>
                            <td>{pdc.periodos or 'No definido'}</td>
                            <td>{pdc.criterios or 'No definido'}</td>
                        </tr>
                    </tbody>
                </table>

                {PdfExportService._generate_adaptations_html(pdc) if hasattr(pdc, 'adaptations') and pdc.adaptations else ''}

                {PdfExportService._generate_intelligences_html(pdc) if hasattr(pdc, 'inteligencias') and pdc.inteligencias else ''}

                {PdfExportService._generate_products_html(pdc) if hasattr(pdc, 'productos') and pdc.productos else ''}
            </div>

            <div class="footer">
                <p>{branding.footer_text or branding.school_name}</p>
                <p class="generated">Generado: {hoje} {datetime.utcnow().strftime('%H:%M:%S')}</p>
            </div>
        </body>
        </html>
        """
        return html

    @staticmethod
    def _generate_css(branding: BrandingConfig) -> str:
        """Generate CSS for PDF styling with branding"""
        css = f"""
        @page {{
            size: letter;
            margin: 1in;
            @bottom-center {{
                content: "Página " counter(page) " de " counter(pages);
            }}
        }}

        body {{
            font-family: {branding.primary_font}, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
        }}

        .header {{
            text-align: center;
            border-bottom: 3px solid {branding.header_color};
            padding-bottom: 0.5in;
            margin-bottom: 0.5in;
        }}

        .header h1 {{
            color: {branding.header_color};
            font-size: 18pt;
            margin: 0;
            padding: 0;
        }}

        .header .date {{
            color: #666;
            font-size: 9pt;
            margin: 0.2in 0 0 0;
        }}

        h2 {{
            color: {branding.header_color};
            font-size: 16pt;
            margin-top: 0.3in;
            margin-bottom: 0.2in;
            border-bottom: 2px solid {branding.footer_color};
            padding-bottom: 0.1in;
        }}

        h3 {{
            color: {branding.header_color};
            font-size: 13pt;
            margin-top: 0.2in;
            margin-bottom: 0.15in;
        }}

        .subtitle {{
            color: #666;
            font-size: 12pt;
            font-weight: bold;
            margin: 0.1in 0;
        }}

        .description {{
            color: #555;
            font-size: 10pt;
            margin: 0.2in 0;
            font-style: italic;
        }}

        .info-table, .mescp-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 0.2in 0;
            font-size: 10pt;
        }}

        .info-table td, .mescp-table td, .mescp-table th {{
            border: 1px solid #999;
            padding: 0.1in 0.15in;
        }}

        .info-table td.label {{
            background-color: {branding.header_color};
            color: white;
            font-weight: bold;
            width: 30%;
        }}

        .mescp-table th {{
            background-color: {branding.header_color};
            color: white;
            font-weight: bold;
            text-align: left;
            font-size: 9pt;
        }}

        .mescp-table td {{
            vertical-align: top;
        }}

        .content {{
            margin: 0.3in 0;
        }}

        .footer {{
            margin-top: 0.5in;
            padding-top: 0.3in;
            border-top: 2px solid {branding.footer_color};
            text-align: center;
            font-size: 9pt;
            color: {branding.footer_color};
        }}

        .footer p {{
            margin: 0.05in 0;
        }}

        .generated {{
            color: #999;
            font-size: 8pt;
        }}

        ul {{
            margin: 0.1in 0;
            padding-left: 0.3in;
        }}

        li {{
            margin: 0.05in 0;
        }}
        """
        return css

    @staticmethod
    def _generate_adaptations_html(pdc: PDC) -> str:
        """Generate HTML for adaptations section"""
        if not hasattr(pdc, "adaptations") or not pdc.adaptations:
            return ""

        html = "<h3>Adaptaciones Curriculares</h3><ul>"
        for adaptation in pdc.adaptations[:5]:
            description = getattr(adaptation, "description", "Adaptación")
            html += f"<li>{description}</li>"
        html += "</ul>"
        return html

    @staticmethod
    def _generate_intelligences_html(pdc: PDC) -> str:
        """Generate HTML for multiple intelligences section"""
        if not hasattr(pdc, "inteligencias") or not pdc.inteligencias:
            return ""

        intelligences = [
            getattr(intel, "name", f"Inteligencia {i}")
            for i, intel in enumerate(pdc.inteligencias[:8])
        ]
        return f"<h3>Inteligencias Múltiples</h3><p>{', '.join(intelligences)}</p>"

    @staticmethod
    def _generate_products_html(pdc: PDC) -> str:
        """Generate HTML for expected products section"""
        if not hasattr(pdc, "productos") or not pdc.productos:
            return ""

        html = "<h3>Productos Esperados</h3><ul>"
        for producto in pdc.productos[:5]:
            name = getattr(producto, "name", "Producto")
            html += f"<li>{name}</li>"
        html += "</ul>"
        return html
