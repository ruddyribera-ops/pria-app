declare module 'html-docx-js' {
  interface HtmlDocxModule {
    asBlob(html: string): Blob;
  }
  const mod: HtmlDocxModule;
  export default mod;
}

declare module 'https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx-js.min.js' {
  interface HtmlDocxModule {
    asBlob(html: string): Blob;
  }
  const mod: HtmlDocxModule;
  export default mod;
}
