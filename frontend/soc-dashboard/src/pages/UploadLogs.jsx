import { useCallback, useState } from 'react';
import api from '../services/api';

const ACCEPTED_EXTENSIONS = ['.log', '.txt'];

function isValidFile(file) {
  if (!file) return false;
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function UploadLogs() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recentUploads, setRecentUploads] = useState([]);

  const handleFile = (file) => {
    setError(null);
    setSuccess(null);
    setProgress(0);
    if (!file) return;
    if (!isValidFile(file)) {
      setSelectedFile(null);
      setError('Unsupported file type. Please upload .log or .txt files.');
      return;
    }
    setSelectedFile(file);
  };

  const onDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const onFileInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);
    setProgress(5);

    try {
      // Use a dedicated axios call here to track progress
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.uploadLogs(selectedFile, {
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const percent = Math.round((evt.loaded / evt.total) * 90) + 5;
          setProgress(Math.min(percent, 100));
        },
      });

      const stats = response?.stats || {};
      const parsed = stats.parsedCount ?? 0;
      const stored = stats.storedCount ?? 0;

      setSuccess(
        `Upload complete. Parsed ${parsed} events, stored ${stored} log entries.`
      );
      setProgress(100);

      const uploadEntry = {
        id: Date.now(),
        name: response?.file?.originalname || selectedFile.name,
        size: response?.file?.size || selectedFile.size,
        parsedCount: parsed,
        storedCount: stored,
      };
      setRecentUploads((prev) => [uploadEntry, ...prev].slice(0, 5));
    } catch (err) {
      console.error('Upload failed:', err);
      const msg = err?.response?.data?.error || 'Upload failed. Please try again.';
      setError(msg);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const selectedFileLabel = selectedFile
    ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
    : 'No file selected yet';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Upload Logs</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload raw authentication logs (.log, .txt) to parse and feed into the
          detection engine.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center text-sm transition-colors ${
            dragActive
              ? 'border-teal-400 bg-slate-900'
              : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
          }`}
          onClick={() => {
            const input = document.getElementById('log-file-input');
            if (input) input.click();
          }}
        >
          <p className="text-slate-200">
            Drag and drop a log file here, or <span className="text-teal-400">browse</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Accepted formats: .log, .txt • Max 10MB</p>
          <p className="mt-3 text-xs text-slate-400">{selectedFileLabel}</p>
          <input
            id="log-file-input"
            type="file"
            accept=".log,.txt,text/plain"
            onChange={onFileInputChange}
            className="hidden"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-900/40 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-100">
            {success}
          </div>
        )}

        {uploading && (
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-500 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-500 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload Logs'}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Recent Uploads (this session)
        </h2>
        {recentUploads.length === 0 ? (
          <p className="text-xs text-slate-500">
            No uploads yet. After uploading a file, it will appear here with basic
            stats.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 text-xs text-slate-200">
            {recentUploads.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-slate-100">{item.name}</div>
                  <div className="text-[0.7rem] text-slate-400">
                    {(item.size / 1024).toFixed(1)} KB • Parsed {item.parsedCount} • Stored{' '}
                    {item.storedCount}
                  </div>
                </div>
                <div className="text-[0.7rem] text-slate-500">
                  Ingested into analytics & detection pipeline.
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
