'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortal } from '@/components/PortalAuthProvider';
import { createClient } from '@/lib/supabase';
import {
  Wrench,
  Snowflake,
  Flame,
  Droplets,
  Settings,
  Shield,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const SERVICE_TYPES = [
  { id: 'ac_repair', label: 'AC Repair', icon: Snowflake, description: 'Cooling system not working properly' },
  { id: 'heating_repair', label: 'Heating Repair', icon: Flame, description: 'Furnace or heat pump issues' },
  { id: 'maintenance', label: 'Tune-Up / Maintenance', icon: Settings, description: 'Seasonal preventive maintenance' },
  { id: 'plumbing', label: 'Plumbing', icon: Droplets, description: 'Pipes, drains, or water heater' },
  { id: 'installation', label: 'New Installation', icon: Wrench, description: 'New system or equipment install' },
  { id: 'inspection', label: 'System Inspection', icon: Shield, description: 'Full diagnostic evaluation' },
];

// Generate available dates (next 14 days, skip Sundays)
function getAvailableDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 21 && dates.length < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) dates.push(d); // skip Sunday
  }
  return dates;
}

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
];

export default function SchedulePage() {
  const { customer } = usePortal();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableDates = getAvailableDates();

  const handleSubmit = async () => {
    if (!customer || !serviceType || !selectedDate || !selectedTime) return;
    setSubmitting(true);

    // Parse time
    const [timeStr, period] = selectedTime.split(' ');
    const [hours, minutes] = timeStr.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    const startTime = new Date(selectedDate);
    startTime.setHours(hour24, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const label = SERVICE_TYPES.find(s => s.id === serviceType)?.label || serviceType;

    const supabase = createClient();
    const { error } = await supabase.from('bookings').insert({
      name: customer.full_name,
      contact: customer.phone || customer.email || '',
      service_type: label,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: notes || null,
      status: 'scheduled',
      group_id: customer.group_id,
    } as Record<string, unknown>);

    setSubmitting(false);
    if (!error) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-[var(--navy)] mb-2">Service Scheduled!</h1>
        <p className="text-sm text-[var(--navy)]/50 mb-6">
          Your {SERVICE_TYPES.find(s => s.id === serviceType)?.label} appointment has been booked for{' '}
          {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' at '}{selectedTime}. We&apos;ll see you then!
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/portal/appointments')}
            className="rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-2.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg transition-all"
          >
            View Appointments
          </button>
          <button
            onClick={() => router.push('/portal')}
            className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-semibold text-[var(--navy)]/60 hover:bg-gray-50 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => step > 1 ? setStep(step - 1) : router.push('/portal')} className="flex items-center gap-1 text-sm text-[var(--navy)]/50 hover:text-[var(--navy)] mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {step > 1 ? 'Back' : 'Dashboard'}
        </button>
        <h1 className="text-xl font-bold text-[var(--navy)]">Schedule a Service</h1>
        <p className="text-sm text-[var(--navy)]/50">As a Priority Member, you get same-day scheduling priority.</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              s <= step ? 'bg-[var(--gold)] text-[var(--navy)]' : 'bg-gray-100 text-gray-400'
            }`}>
              {s}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${s <= step ? 'text-[var(--navy)]' : 'text-gray-400'}`}>
              {s === 1 ? 'Service' : s === 2 ? 'Date & Time' : 'Confirm'}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-[var(--gold)]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Service type */}
      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {SERVICE_TYPES.map(svc => (
            <button
              key={svc.id}
              onClick={() => { setServiceType(svc.id); setStep(2); }}
              className={`p-4 rounded-xl border text-left transition-all hover:border-[var(--gold)]/50 hover:shadow-md ${
                serviceType === svc.id
                  ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-md'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <svc.icon className="w-6 h-6 text-[var(--gold)] mb-2" />
              <p className="font-bold text-sm text-[var(--navy)]">{svc.label}</p>
              <p className="text-xs text-[var(--navy)]/40 mt-0.5">{svc.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Date picker */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[var(--gold)]" />
              <h2 className="font-bold text-sm text-[var(--navy)]">Select a Date</h2>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {availableDates.map(d => {
                const isSelected = selectedDate?.toDateString() === d.toDateString();
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDate(d)}
                    className={`p-2 rounded-lg text-center transition-all ${
                      isSelected
                        ? 'bg-[var(--gold)] text-[var(--navy)] font-bold shadow-md'
                        : 'bg-[#f8f7f4] hover:bg-[var(--gold)]/10 text-[var(--navy)]'
                    }`}
                  >
                    <p className="text-[10px] uppercase font-medium opacity-60">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold">{d.getDate()}</p>
                    <p className="text-[10px] opacity-60">
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker */}
          {selectedDate && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[var(--gold)]" />
                <h2 className="font-bold text-sm text-[var(--navy)]">Select a Time</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    onClick={() => { setSelectedTime(time); setStep(3); }}
                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      selectedTime === time
                        ? 'bg-[var(--gold)] text-[var(--navy)] shadow-md'
                        : 'bg-[#f8f7f4] hover:bg-[var(--gold)]/10 text-[var(--navy)]'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-bold text-[var(--navy)]">Confirm Your Appointment</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-[var(--navy)]/50">Service</span>
                <span className="text-sm font-semibold text-[var(--navy)]">
                  {SERVICE_TYPES.find(s => s.id === serviceType)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-[var(--navy)]/50">Date</span>
                <span className="text-sm font-semibold text-[var(--navy)]">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-[var(--navy)]/50">Time</span>
                <span className="text-sm font-semibold text-[var(--navy)]">{selectedTime}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--navy)]/50">Member</span>
                <span className="text-sm font-semibold text-[var(--navy)]">{customer?.full_name}</span>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[var(--navy)] mb-1.5">
                <MessageSquare className="w-4 h-4 text-[var(--navy)]/30" />
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe the issue or any special instructions..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50 focus:border-[var(--gold)] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-[var(--navy)]/60 hover:bg-gray-50 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-3 text-sm font-bold text-[var(--navy)] hover:shadow-lg hover:shadow-[var(--gold)]/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Booking...
                </span>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
