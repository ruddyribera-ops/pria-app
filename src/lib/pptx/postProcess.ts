import JSZip from 'jszip';

/**
 * Reorders children of <p:presentation> to match the OOXML CT_Presentation
 * schema sequence. PowerPoint rejects the file when the order is wrong.
 *
 * Required order inside <p:presentation>:
 *   1. <p:sldMasterIdLst>
 *   2. <p:notesMasterIdLst>
 *   3. <p:sldIdLst>
 *   4. <p:sldSz>
 *   5. <p:notesSz>
 *   6. <p:defaultTextStyle>
 *   7. <p:extLst> (optional, always last)
 *
 * pptxgenjs v4.0.1 emits <p:sldIdLst> before <p:notesMasterIdLst>, which
 * violates the schema. This swaps the two blocks when they appear in the
 * wrong order, leaving all other children untouched. String surgery is
 * used because pptxgenjs output is deterministic and a full XML parse
 * would require a heavy dependency for a single reorder.
 */
export async function repairPresentationOrder(xml: string): Promise<string> {
  const sldIdLstRe = /(<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>)/;
  const notesMasterIdLstRe = /(<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>)/;

  const sldMatch = xml.match(sldIdLstRe);
  const notesMatch = xml.match(notesMasterIdLstRe);
  if (!sldMatch || !notesMatch) return xml;

  const sldBlock = sldMatch[1];
  const notesBlock = notesMatch[1];
  const sldPos = sldMatch.index ?? -1;
  const notesPos = notesMatch.index ?? -1;

  if (notesPos > sldPos) {
    const MARKER = '__PPTX_REPAIR_MARKER__';
    return xml
      .replace(sldBlock, MARKER + sldBlock)
      .replace(notesBlock, sldBlock)
      .replace(MARKER + sldBlock, notesBlock);
  }
  return xml;
}

/**
 * Repairs pptxgenjs v4.0.1 phantom slideMaster Override entries AND
 * fixes the OOXML CT_Presentation element-order violation.
 *
 * Fix 1 (phantom overrides): The library writes an Override in
 * [Content_Types].xml for slideMasterN.xml for each slide N, but only
 * ever emits slideMaster1.xml in the zip. PowerPoint refuses to open
 * such a deck and "Repair" can't recover it.
 *
 * Fix 2 (element order): pptxgenjs emits <p:sldIdLst> before
 * <p:notesMasterIdLst> inside <p:presentation>. The OOXML schema
 * requires notesMasterIdLst first, so PowerPoint rejects the file.
 *
 * Both fixes are independent. The function returns a new Blob with
 * both repairs applied (or the original blob if neither is needed).
 */
export async function repairPptxOverwrites(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // ---- Fix 1: phantom slideMaster Overrides in [Content_Types].xml ----
  const ctEntry = zip.file('[Content_Types].xml');
  if (ctEntry) {
    const ctXml = await ctEntry.async('string');

    const masterFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(name))
      .map((name) => name.replace(/^ppt\/slideMasters\//, ''));

    const declared = new Set<string>();
    const overrideRe = /<Override\s+PartName="\/ppt\/slideMasters\/(slideMaster\d+\.xml)"[^>]*\/>/g;
    let m: RegExpExecArray | null;
    while ((m = overrideRe.exec(ctXml)) !== null) {
      declared.add(m[1]);
    }

    const phantom: string[] = [];
    for (const name of declared) {
      if (!masterFiles.includes(name)) phantom.push(name);
    }

    if (phantom.length > 0) {
      const phantomNames = new Set(phantom);
      const stripped = ctXml
        .replace(overrideRe, (full, name) => (phantomNames.has(name) ? '' : full))
        .replace(/<!--[\s\S]*?-->/g, '');

      zip.file('[Content_Types].xml', stripped);
    }
  }

  // ---- Fix 2: reorder children of <p:presentation> ----
  const presEntry = zip.file('ppt/presentation.xml');
  if (presEntry) {
    const presXml = await presEntry.async('string');
    const fixed = await repairPresentationOrder(presXml);
    if (fixed !== presXml) {
      zip.file('ppt/presentation.xml', fixed);
    }
  }

  const out = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    compression: 'DEFLATE',
  });

  return out;
}