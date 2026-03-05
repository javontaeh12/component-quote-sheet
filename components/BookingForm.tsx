'use client';

import { useState, useRef } from 'react';
import { CheckIcon, UploadIcon, XIcon } from './icons';

const SERVICE_TYPES = [
  'AC / Cooling',
  'Heating / Furnace',
  'Refrigerator Repair',
  'Freezer Repair',
  'Commercial Refrigeration',
  'Ductless / Mini-Split',
  'System Tune-Up',
  'Full Diagnostics',
  'Other',
];

const URGENCY_OPTIONS = [
  { value: 'emergency', label: 'Emergency', desc: 'Not working at all' },
  { value: 'soon', label: 'Soon', desc: 'Having issues but still running' },
  { value: 'routine', label: 'Routine', desc: 'Maintenance or tune-up' },
  { value: 'question', label: 'Just a question', desc: '' },
];

const STARTED_OPTIONS = ['Today', 'This week', 'More than a week', 'Not sure'];

const SYMPTOM_OPTIONS = [
  'Strange noises',
  'Unusual smells',
  'Water or ice buildup',
  'Higher energy bills',
  'Unit won\'t turn on',
  'Unit won\'t turn off',
  'Uneven temperatures',
  'Outdoor fan not spinning',
  'Thermostat not reaching set temp',
  'Thermostat screen is blank',
  'No airflow from vents',
  'Blowing warm air (should be cool)',
  'Blowing cool air (should be warm)',
  'Short cycling (turns on/off rapidly)',
  'Leaking refrigerant',
  'Tripping breaker',
  'Frozen coils or lines',
];

const STEP_LABELS = ['Contact', 'Service', 'Problem', 'Upload', 'Review'];

interface FormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  serviceType: string;
  urgency: string;
  equipmentInfo: string;
  issue: string;
  startedWhen: string;
  symptoms: string[];
  membershipInterest: boolean;
}

export default function BookingForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    zip: '',
    serviceType: '',
    urgency: '',
    equipmentInfo: '',
    issue: '',
    startedWhen: '',
    symptoms: [],
    membershipInterest: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (fields: Partial<FormData>) => setForm(prev => ({ ...prev, ...fields }));

  const toggleSymptom = (s: string) => {
    setForm(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(s)
        ? prev.symptoms.filter(x => x !== s)
        : [...prev.symptoms, s],
    }));
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const allowed = 5 - files.length;
    const newFiles = Array.from(incoming).slice(0, allowed);
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        setPreviews(prev => [...prev, url]);
      } else {
        setPreviews(prev => [...prev, '']);
      }
    });
  };

  const removeFile = (i: number) => {
    if (previews[i]) URL.revokeObjectURL(previews[i]);
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const canNext = () => {
    if (step === 1) return form.name && form.phone && form.email && form.address && form.city && form.zip;
    if (step === 2) return form.serviceType && form.urgency;
    if (step === 3) return form.issue;
    return true;
  };

  const handleSubmit = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      // Upload files if any
      const fileUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch('/api/request/upload', { method: 'POST', body: fd });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data.url) fileUrls.push(data.url);
        }
      }

      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          contact: form.phone,
          address: form.address,
          city: form.city,
          zip: form.zip,
          service_type: form.serviceType,
          urgency: form.urgency,
          equipment_info: form.equipmentInfo,
          issue: form.issue,
          started_when: form.startedWhen,
          symptoms: form.symptoms,
          file_urls: fileUrls,
          membership_interest: form.membershipInterest,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
          <CheckIcon className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-[var(--navy)] mb-3">
          Request Submitted!
        </h3>
        <p className="text-[var(--steel)] mb-8 max-w-md mx-auto">
          We&apos;ll review your request and reach out shortly to discuss next steps and scheduling.
        </p>
        <button
          onClick={() => {
            setStatus('idle');
            setStep(1);
            setForm({
              name: '', phone: '', email: '', address: '', city: '', zip: '',
              serviceType: '', urgency: '', equipmentInfo: '',
              issue: '', startedWhen: '', symptoms: [], membershipInterest: false,
            });
            setFiles([]);
            setPreviews([]);
          }}
          className="text-[var(--accent)] font-semibold hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const isActive = num === step;
            const isDone = num < step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => { if (isDone) setStep(num); }}
                className={`flex flex-col items-center gap-1 flex-1 ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {isDone ? <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : num}
                </div>
                <span className={`text-[10px] sm:text-xs font-medium ${
                  isActive ? 'text-[var(--navy)]' : 'text-[var(--steel)]'
                }`}>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Contact */}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Contact Information</h3>
          <p className="text-sm text-[var(--steel)]">How can we reach you?</p>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Full Name *</label>
            <input type="text" required value={form.name} onChange={e => update({ name: e.target.value })} className="form-input" placeholder="John Smith" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Phone *</label>
              <input type="tel" required value={form.phone} onChange={e => update({ phone: e.target.value })} className="form-input" placeholder="(910) 555-0123" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={e => update({ email: e.target.value })} className="form-input" placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Street Address *</label>
            <input type="text" required value={form.address} onChange={e => update({ address: e.target.value })} className="form-input" placeholder="123 Main St" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">City *</label>
              <input type="text" required value={form.city} onChange={e => update({ city: e.target.value })} className="form-input" placeholder="Tallahassee" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Zip Code *</label>
              <input type="text" required value={form.zip} onChange={e => update({ zip: e.target.value })} className="form-input" placeholder="32301" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Service Details */}
      {step === 2 && (
        <div className="space-y-3 sm:space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Service Details</h3>
          <p className="text-sm text-[var(--steel)]">What do you need help with?</p>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Service type *</label>
            <select value={form.serviceType} onChange={e => update({ serviceType: e.target.value })} className="form-input">
              <option value="">Select a service...</option>
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">How urgent? *</label>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
              {URGENCY_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.urgency === opt.value
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={opt.value}
                    checked={form.urgency === opt.value}
                    onChange={e => update({ urgency: e.target.value })}
                    className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[var(--navy)]">{opt.label}</span>
                    {opt.desc && <span className="hidden sm:inline text-sm text-[var(--steel)]"> &mdash; {opt.desc}</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Equipment Brand &amp; Model (optional)</label>
            <input type="text" value={form.equipmentInfo} onChange={e => update({ equipmentInfo: e.target.value })} className="form-input" placeholder="e.g. Carrier 24ACC636A003" />
          </div>
        </div>
      )}

      {/* Step 3: Problem Description */}
      {step === 3 && (
        <div className="space-y-3 sm:space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Describe the Problem</h3>
          <p className="text-sm text-[var(--steel)]">The more detail you provide, the faster we can help.</p>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">What&apos;s happening? *</label>
            <textarea
              required
              rows={3}
              value={form.issue}
              onChange={e => update({ issue: e.target.value })}
              className="form-input resize-none"
              placeholder="AC not cooling, strange noises, water leak, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">When did it start?</label>
            <select value={form.startedWhen} onChange={e => update({ startedWhen: e.target.value })} className="form-input">
              <option value="">Select...</option>
              {STARTED_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">Have you noticed any of these?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 max-h-[40vh] overflow-y-auto">
              {SYMPTOM_OPTIONS.map(s => (
                <label
                  key={s}
                  className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.symptoms.includes(s)
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.symptoms.includes(s)}
                    onChange={() => toggleSymptom(s)}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-[var(--navy)]">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Upload */}
      {step === 4 && (
        <div className="space-y-3 sm:space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Photos &amp; Videos</h3>
          <p className="text-sm text-[var(--steel)]">Upload up to 5 photos or videos of the issue (optional).</p>

          {files.length < 5 && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--accent)]', 'bg-[var(--accent)]/5'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-[var(--accent)]', 'bg-[var(--accent)]/5'); }}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-[var(--accent)]', 'bg-[var(--accent)]/5'); addFiles(e.dataTransfer.files); }}
              className="flex flex-col items-center gap-2 sm:gap-3 cursor-pointer border-2 border-dashed border-[var(--border)] rounded-2xl px-6 py-6 sm:py-10 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
            >
              <UploadIcon className="w-8 h-8 text-[var(--steel)]" />
              <span className="text-sm text-[var(--steel)] text-center">
                Drag &amp; drop or click to upload<br />
                <span className="text-xs">Images and videos accepted</span>
              </span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={e => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ''; }}
            className="hidden"
          />

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map((f, i) => (
                <div key={i} className="relative group rounded-xl border border-[var(--border)] overflow-hidden bg-gray-50">
                  {previews[i] ? (
                    <img src={previews[i]} alt={f.name} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center">
                      <span className="text-xs text-[var(--steel)] text-center px-2 truncate">{f.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                  <div className="px-2 py-1.5 text-xs text-[var(--steel)] truncate">{f.name}</div>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={form.membershipInterest}
              onChange={e => update({ membershipInterest: e.target.checked })}
              className="mt-0.5 w-5 h-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span className="text-sm text-[var(--steel)]">
              I&apos;m interested in learning about priority membership plans
            </span>
          </label>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div className="space-y-3 sm:space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Review &amp; Submit</h3>
          <p className="text-sm text-[var(--steel)]">Make sure everything looks good before submitting.</p>

          <div className="space-y-4">
            <ReviewBlock title="Contact Info" onEdit={() => setStep(1)}>
              <p className="font-medium text-[var(--navy)]">{form.name}</p>
              <p>{form.phone} &middot; {form.email}</p>
              <p>{form.address}, {form.city} {form.zip}</p>
            </ReviewBlock>

            <ReviewBlock title="Service Details" onEdit={() => setStep(2)}>
              <p><span className="font-medium text-[var(--navy)]">Type:</span> {form.serviceType}</p>
              <p><span className="font-medium text-[var(--navy)]">Urgency:</span> {URGENCY_OPTIONS.find(o => o.value === form.urgency)?.label}</p>
              {form.equipmentInfo && <p><span className="font-medium text-[var(--navy)]">Equipment:</span> {form.equipmentInfo}</p>}
            </ReviewBlock>

            <ReviewBlock title="Problem" onEdit={() => setStep(3)}>
              <p className="text-[var(--navy)]">{form.issue}</p>
              {form.startedWhen && <p><span className="font-medium text-[var(--navy)]">Started:</span> {form.startedWhen}</p>}
              {form.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.symptoms.map(s => (
                    <span key={s} className="inline-block text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </ReviewBlock>

            <ReviewBlock title="Uploads" onEdit={() => setStep(4)}>
              <p>{files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} attached` : 'No files attached'}</p>
              {form.membershipInterest && <p className="text-[var(--accent)] text-xs font-medium mt-1">Interested in priority membership</p>}
            </ReviewBlock>
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
              {errorMsg}
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5 sm:mt-8 pt-4 sm:pt-5 border-t border-[var(--border)]">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 text-sm font-semibold text-[var(--navy)] border border-[var(--border)] rounded-full hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        ) : <div />}

        {step < 5 ? (
          <button
            type="button"
            disabled={!canNext()}
            onClick={() => setStep(step + 1)}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={status === 'loading'}
            onClick={handleSubmit}
            className="px-8 py-3 text-base font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </span>
            ) : 'Submit Request'}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-gray-50/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-[var(--navy)] uppercase tracking-wider">{title}</h4>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-[var(--accent)] hover:underline">Edit</button>
      </div>
      <div className="text-sm text-[var(--steel)] space-y-0.5">{children}</div>
    </div>
  );
}
