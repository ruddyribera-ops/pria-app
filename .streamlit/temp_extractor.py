import zipfile
import re
import os

files = [
    r"C:\Users\Windows\Documents\Apps\Pipeline Planificacion\PDC_5º_Pri_Bi-abr.docx",
    r"C:\Users\Windows\Documents\Apps\Pipeline Planificacion\SEMANA 6 - 5P.docx"
]

for docx_path in files:
    try:
        with zipfile.ZipFile(docx_path) as docx:
            xml_content = docx.read('word/document.xml').decode('utf-8')
            # Extract plain text from xml tags <w:t>...</w:t>
            text = re.sub(r'<[^>]+>', ' ', xml_content)
            # Remove extra spaces
            text = re.sub(r'\s+', ' ', text).strip()
            
            output_name = "pdc_extracted.txt" if "PDC" in docx_path else "semana_extracted.txt"
            with open(output_name, "w", encoding="utf-8") as out:
                out.write(text)
            print(f"Successfully extracted {os.path.basename(docx_path)}")
    except Exception as e:
        print(f"Failed to extract {os.path.basename(docx_path)}: {e}")
