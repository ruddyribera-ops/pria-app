// ZIP parser — handles stored (method 0) and deflate (method 8)
// Used by docx, pptx, xlsx parsers

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function parseZip(buffer: ArrayBuffer): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });

  let offset = 0;
  const entries: { name: string; off: number; csize: number; usize: number; method: number }[] = [];

  while (offset < buffer.byteLength - 30) {
    const sig = readU32(view, offset);
    if (sig === 0x04034b50) {
      const nameLen = readU16(view, offset + 26);
      const extraLen = readU16(view, offset + 28);
      const method = readU16(view, offset + 8);
      const csize = readU32(view, offset + 18);
      const usize = readU32(view, offset + 22);
      const nameBytes = new Uint8Array(buffer, offset + 30, nameLen);
      const name = decoder.decode(nameBytes).replace(/\\/g, '/');
      entries.push({ name, off: offset + 30 + nameLen + extraLen, csize, usize, method });
      offset += 30 + nameLen + extraLen + csize;
    } else if (sig === 0x02014b50 || sig === 0x06054b50) {
      break;
    } else {
      offset++;
    }
  }

  for (const entry of entries) {
    if (!entry.name || entry.name.endsWith('/')) continue;
    try {
      let data: Uint8Array;
      if (entry.method === 0) {
        data = new Uint8Array(buffer, entry.off, entry.csize);
      } else if (entry.method === 8) {
        const sliced = buffer.slice(entry.off, entry.off + entry.csize);
        const ds = new DecompressionStream('deflate');
        const blob = new Blob([sliced]);
        blob.stream().pipeTo(ds.writable);
        const decompressed = await new Response(ds.readable).arrayBuffer();
        data = new Uint8Array(decompressed);
      } else {
        continue;
      }
      result[entry.name] = decoder.decode(data);
    } catch {
      // Skip corrupted entries silently
    }
  }

  return result;
}

export function extractTextFromXml(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
