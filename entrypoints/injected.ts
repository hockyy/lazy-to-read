// This script runs in the MAIN world (page context) and handles markdown rendering

declare global {
  interface Window {
    marked?: any;
    MathJax?: any;
  }
}

export default defineUnlistedScript(() => {
  let mathjaxReady = false;
  
  // Listen for MathJax loaded event
  window.addEventListener('lazy_to_read_mathjax_loaded', () => {
    mathjaxReady = true;
  });
  
  // Listen for render requests from content script
  window.addEventListener('lazy_to_read_render_request', async (e: any) => {
    try {
      const { markdown, renderId } = e.detail;
      
      // Wait for marked to be available
      let retries = 0;
      while (!window.marked && retries < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        retries++;
      }
      
      if (!window.marked) {
        throw new Error('Marked library not loaded');
      }
      
      // Parse markdown
      const html = await window.marked.parse(markdown);
      const noBreaks = html.replace(/<br\s*\/?>/gi, ' ');
      
      window.dispatchEvent(new CustomEvent('lazy_to_read_render_response', {
        detail: { html: noBreaks, renderId }
      }));
      
      // Trigger MathJax typesetting after a short delay
      setTimeout(async () => {
        if (window.MathJax) {
          try {
            // MathJax 4.0.0 API - typeset the document
            if (window.MathJax.typesetPromise) {
              await window.MathJax.typesetPromise();
            } else if (window.MathJax.typeset) {
              window.MathJax.typeset();
            }
          } catch (err: any) {
            console.warn('MathJax typesetting error:', err);
          }
        }
      }, 100);
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('lazy_to_read_render_response', {
        detail: { error: error.message, renderId: e.detail.renderId }
      }));
    }
  });
  
  // Listen for library check requests
  window.addEventListener('lazy_to_read_check_libs', (e: any) => {
    const { checkId } = e.detail;
    const loaded = typeof window.marked !== 'undefined' && (mathjaxReady || typeof window.MathJax !== 'undefined');
    
    window.dispatchEvent(new CustomEvent('lazy_to_read_check_response', {
      detail: { loaded, checkId }
    }));
  });
});
