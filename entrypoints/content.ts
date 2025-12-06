import DOMPurify from 'dompurify';

const SUMMARY_CONTAINER_ID = 'lazy-to-read-summary';
const BAR_ID = 'lazy-to-read-brief-bar';
const BUTTON_ID = 'lazy-to-read-brief-button';

declare global {
  interface Window {
    katex: any;
    renderMathInElement: any;
    marked: { parse: (md: string) => string | Promise<string> };
  }
}

let librariesLoaded = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadStylesheet(href: string): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

async function ensureLibraries(): Promise<void> {
  if (librariesLoaded) return;

  const extUrl = (browser.runtime.getURL as (path: string) => string)('libs/');
  
  // Load KaTeX CSS
  loadStylesheet(extUrl + 'katex.min.css');
  
  // Load scripts in order
  await loadScript(extUrl + 'katex.min.js');
  await loadScript(extUrl + 'auto-render.min.js');
  await loadScript(extUrl + 'marked.min.js');
  
  librariesLoaded = true;
}

function ensureStyles() {
  if (document.getElementById('lazy-to-read-styles')) return;

  const style = document.createElement('style');
  style.id = 'lazy-to-read-styles';
  style.textContent = `
    #${BAR_ID} {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      margin: 16px 0;
      border: 1px solid #d0d7e3;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    #${BUTTON_ID} {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }

    #${BUTTON_ID}:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
      transform: translateY(-1px);
    }

    #${BUTTON_ID}:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .lazy-to-read-status {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }

    .lazy-to-read-status.error {
      color: #dc2626;
    }

    .lazy-to-read-status.success {
      color: #16a34a;
    }

    #${SUMMARY_CONTAINER_ID} {
      background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      border-radius: 10px;
      padding: 20px 24px;
      margin: 16px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -0.01em;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-title::before {
      content: "✨";
      font-size: 16px;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body {
      color: #334155;
      font-size: 14px;
      line-height: 1.7;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body p {
      margin: 0 0 12px;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body p:last-child {
      margin-bottom: 0;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body ul,
    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body ol {
      margin: 0 0 12px;
      padding-left: 20px;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body li {
      margin-bottom: 6px;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body strong {
      color: #1e293b;
      font-weight: 600;
    }

    #${SUMMARY_CONTAINER_ID} .lazy-to-read-body code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
      color: #475569;
    }

    #${SUMMARY_CONTAINER_ID} .katex {
      font-size: 1em;
    }

    #${SUMMARY_CONTAINER_ID} .katex-display {
      margin: 12px 0;
      overflow-x: auto;
    }
  `;

  document.head.appendChild(style);
}

function extractProblemText(problemEl: HTMLElement): string {
  const clone = problemEl.cloneNode(true) as HTMLElement;
  const elementsToRemove = clone.querySelectorAll('script, style, noscript, .input-file, .sample-tests, .note, .property-title');
  elementsToRemove.forEach((el) => el.remove());
  return clone.innerText.trim();
}

function getOrCreateSummaryContainer(problemEl: HTMLElement): HTMLElement {
  const existing = problemEl.querySelector<HTMLElement>(`#${SUMMARY_CONTAINER_ID}`);
  if (existing) return existing;

  const container = document.createElement('div');
  container.id = SUMMARY_CONTAINER_ID;

  const title = document.createElement('div');
  title.className = 'lazy-to-read-title';
  title.textContent = 'AI Brief';
  container.appendChild(title);

  const body = document.createElement('div');
  body.className = 'lazy-to-read-body';
  container.appendChild(body);

  const bar = problemEl.querySelector(`#${BAR_ID}`);
  if (bar?.parentElement) {
    bar.parentElement.insertBefore(container, bar.nextSibling);
  } else {
    problemEl.prepend(container);
  }

  return container;
}

function renderStatus(statusEl: HTMLElement, text: string, variant: 'info' | 'error' | 'success' = 'info') {
  statusEl.textContent = text;
  statusEl.className = `lazy-to-read-status${variant === 'error' ? ' error' : variant === 'success' ? ' success' : ''}`;
}

async function renderMarkdownWithMath(markdown: string, target: HTMLElement): Promise<void> {
  await ensureLibraries();

  // Parse markdown first
  const html = await window.marked.parse(markdown);
  const cleanHtml = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  const noBreaks = cleanHtml.replace(/<br\s*\/?>/gi, ' ');
  target.innerHTML = noBreaks;

  // Then render math with KaTeX auto-render
  if (window.renderMathInElement) {
    window.renderMathInElement(target, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
    });
  }
}

async function briefProblem(problemEl: HTMLElement, button: HTMLButtonElement, statusEl: HTMLElement) {
  const problemText = extractProblemText(problemEl);
  if (!problemText) {
    renderStatus(statusEl, 'Could not read this problem statement.', 'error');
    return;
  }

  button.disabled = true;
  renderStatus(statusEl, 'Briefing...');

  try {
    const response = await browser.runtime.sendMessage({
      type: 'BRIEF_PROBLEM',
      problemText,
    });

    if (response.error) {
      renderStatus(statusEl, response.error, 'error');
      return;
    }

    const summaryContainer = getOrCreateSummaryContainer(problemEl);
    const body = summaryContainer.querySelector('.lazy-to-read-body') as HTMLElement;
    if (body) {
      await renderMarkdownWithMath(response.markdown, body);
    }

    renderStatus(statusEl, 'Brief ready.', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    renderStatus(statusEl, `Briefing failed: ${message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

function insertBriefUI(problemEl: HTMLElement) {
  if (problemEl.querySelector(`#${BAR_ID}`)) return;

  const bar = document.createElement('div');
  bar.id = BAR_ID;

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Brief';

  const status = document.createElement('span');
  status.className = 'lazy-to-read-status';
  status.textContent = 'Ready to brief';

  button.addEventListener('click', () => briefProblem(problemEl, button, status));

  bar.append(button, status);

  const target = problemEl.querySelector('.header') ?? problemEl;
  target.parentElement?.insertBefore(bar, target.nextSibling);
}

async function waitForProblemStatement(): Promise<HTMLElement | null> {
  const existing = document.querySelector<HTMLElement>('.problem-statement');
  if (existing) return existing;

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>('.problem-statement');
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 8000);
  });
}

export default defineContentScript({
  matches: [
    '*://codeforces.com/problemset/problem/*/*',
    '*://*.codeforces.com/problemset/problem/*/*',
  ],
  runAt: 'document_idle',
  async main() {
    const problemEl = await waitForProblemStatement();
    if (!problemEl) return;

    ensureStyles();
    insertBriefUI(problemEl);
  },
});
