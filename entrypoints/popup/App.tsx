import { FormEvent, useEffect, useState } from 'react';
import './App.css';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ModelOption {
  id: string;
  name: string;
}

const storage = (globalThis as any).browser?.storage?.local ??
  (globalThis as any).chrome?.storage?.local;

const STORAGE_KEY = 'openrouterApiKey';
const MODEL_KEY = 'selectedModel';
const CUSTOM_MODEL_KEY = 'customModel';

const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'anthropic/claude-4.5-sonnet', name: 'Claude 4.5 Sonnet' },
  { id: 'custom', name: 'Custom Model' },
];

async function loadSettings(): Promise<{ apiKey: string; model: string; customModel: string }> {
  if (!storage?.get) return { apiKey: '', model: AVAILABLE_MODELS[0].id, customModel: '' };

  return new Promise((resolve) => {
    try {
      const keys = [STORAGE_KEY, MODEL_KEY, CUSTOM_MODEL_KEY];
      const maybePromise = storage.get(keys, (items: any) => {
        resolve({
          apiKey: items?.[STORAGE_KEY] ?? '',
          model: items?.[MODEL_KEY] ?? AVAILABLE_MODELS[0].id,
          customModel: items?.[CUSTOM_MODEL_KEY] ?? '',
        });
      });

      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .then((items: any) =>
            resolve({
              apiKey: items?.[STORAGE_KEY] ?? '',
              model: items?.[MODEL_KEY] ?? AVAILABLE_MODELS[0].id,
              customModel: items?.[CUSTOM_MODEL_KEY] ?? '',
            })
          )
          .catch(() => resolve({ apiKey: '', model: AVAILABLE_MODELS[0].id, customModel: '' }));
      }
    } catch {
      resolve({ apiKey: '', model: AVAILABLE_MODELS[0].id, customModel: '' });
    }
  });
}

async function persistSettings(apiKey: string, model: string, customModel: string): Promise<boolean> {
  if (!storage?.set) return false;

  return new Promise((resolve) => {
    try {
      const data = {
        [STORAGE_KEY]: apiKey,
        [MODEL_KEY]: model,
        [CUSTOM_MODEL_KEY]: customModel,
      };
      const maybePromise = storage.set(data, () => {
        resolve(true);
      });

      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(() => resolve(true)).catch(() => resolve(false));
      }
    } catch {
      resolve(false);
    }
  });
}

function App() {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [customModel, setCustomModel] = useState('');
  const [status, setStatus] = useState<SaveState>('idle');
  const [message, setMessage] = useState('Enter your OpenRouter API key.');

  useEffect(() => {
    loadSettings().then(({ apiKey, model, customModel }) => {
      setApiKey(apiKey);
      setSelectedModel(model);
      setCustomModel(customModel);
      setStatus(apiKey ? 'saved' : 'idle');
      setMessage(apiKey ? 'Settings loaded.' : 'Enter your OpenRouter API key.');
    });
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('Saving...');

    const trimmedKey = apiKey.trim();
    const trimmedCustom = customModel.trim();

    if (selectedModel === 'custom' && !trimmedCustom) {
      setStatus('error');
      setMessage('Please enter a custom model ID.');
      return;
    }

    const ok = await persistSettings(trimmedKey, selectedModel, trimmedCustom);

    if (ok) {
      setStatus('saved');
      setMessage(trimmedKey ? 'Settings saved.' : 'Cleared API key.');
    } else {
      setStatus('error');
      setMessage('Could not save settings. Please try again.');
    }
  };

  const saving = status === 'saving';
  const isCustom = selectedModel === 'custom';

  return (
    <div className="popup">
      <header className="popup__header">
        <div>
          <p className="eyebrow">Extension</p>
          <h1>lazy-to-read</h1>
        </div>
        <span className="badge">Codeforces brief</span>
      </header>

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="apiKey">OpenRouter API key</label>
        <input
          id="apiKey"
          type="password"
          placeholder="sk-or-v1-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          disabled={saving}
        />

        <label htmlFor="model">Model</label>
        <select
          id="model"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={saving}
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {isCustom && (
          <>
            <label htmlFor="customModel">Custom Model ID</label>
            <input
              id="customModel"
              type="text"
              placeholder="provider/model-name"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={saving}
            />
            <p className="helper helper--small">
              Enter the full model ID from{' '}
              <a href="https://openrouter.ai/models" target="_blank" rel="noreferrer">
                OpenRouter models
              </a>
            </p>
          </>
        )}

        <p className="helper">
          Stored locally in browser storage. Sent only when you press <strong>Brief</strong> on a
          Codeforces problem page.
        </p>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        <p className={`status ${status}`}>{message}</p>
      </form>

      <section className="how-to card">
        <h2>How to use</h2>
        <ol>
          <li>Paste your OpenRouter key above and save.</li>
          <li>Open a Codeforces problem page.</li>
          <li>Press <strong>Brief</strong> to add an AI summary in the statement.</li>
        </ol>
        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="link">
          Get an OpenRouter API key
        </a>
      </section>
    </div>
  );
}

export default App;
