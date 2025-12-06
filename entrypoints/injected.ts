// This script runs in the MAIN world (page context) and handles markdown/math rendering

declare global {
  interface Window {
    katex?: any;
    marked?: any;
  }
}

export default defineUnlistedScript(() => {
  // Listen for render requests from content script
  window.addEventListener('lazy_to_read_render_request', async (e: any) => {
    try {
      const { markdown, renderId } = e.detail;
      
      // Wait for libraries to be available
      let retries = 0;
      while ((!window.katex || !window.marked) && retries < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        retries++;
      }
      
      if (!window.katex || !window.marked) {
        throw new Error('Libraries not loaded');
      }
      
      // Step 1: Extract and protect math expressions before markdown parsing
      const mathPlaceholders: { id: string; content: string; display: boolean }[] = [];
      let protectedMarkdown = markdown;
      
      // Protect display math $$...$$
      protectedMarkdown = protectedMarkdown.replace(/\$\$([\s\S]+?)\$\$/g, (_match: string, content: string) => {
        const id = `MATH_PLACEHOLDER_${mathPlaceholders.length}`;
        mathPlaceholders.push({ id, content: content.trim(), display: true });
        return id;
      });
      
      // Protect inline math $...$
      protectedMarkdown = protectedMarkdown.replace(/\$([^\n$]+?)\$/g, (_match: string, content: string) => {
        const id = `MATH_PLACEHOLDER_${mathPlaceholders.length}`;
        mathPlaceholders.push({ id, content: content.trim(), display: false });
        return id;
      });
      
      // Step 2: Parse markdown
      let html = await window.marked.parse(protectedMarkdown);
      const noBreaks = html.replace(/<br\s*\/?>/gi, ' ');
      
      // Step 3: Restore and render math expressions
      let finalHtml = noBreaks;
      for (const placeholder of mathPlaceholders) {
        try {
          const rendered = window.katex.renderToString(placeholder.content, {
            displayMode: placeholder.display,
            throwOnError: false
          });
          finalHtml = finalHtml.replace(placeholder.id, rendered);
        } catch (err) {
          // If rendering fails, restore original syntax
          const original = placeholder.display 
            ? `$$${placeholder.content}$$` 
            : `$${placeholder.content}$`;
          finalHtml = finalHtml.replace(placeholder.id, original);
        }
      }
      
      window.dispatchEvent(new CustomEvent('lazy_to_read_render_response', {
        detail: { html: finalHtml, renderId }
      }));
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('lazy_to_read_render_response', {
        detail: { error: error.message, renderId: e.detail.renderId }
      }));
    }
  });
  
  // Listen for library check requests
  window.addEventListener('lazy_to_read_check_libs', (e: any) => {
    const { checkId } = e.detail;
    const loaded = typeof window.katex !== 'undefined' && 
                  typeof window.marked !== 'undefined';
    
    window.dispatchEvent(new CustomEvent('lazy_to_read_check_response', {
      detail: { loaded, checkId }
    }));
  });
});

