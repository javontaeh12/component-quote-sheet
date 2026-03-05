'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { Button, Input, Card, CardContent } from './ui';
import { formatCurrency } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Camera,
  Upload,
  Check,
  Save,
  X,
  Shield,
  Thermometer,
  Clock,
  Zap,
  Heart,
} from 'lucide-react';
import type {
  ServiceReportMedia,
  RepairOption,
  RepairLineItem,
  UpgradeItem,
} from '@/types';

interface CustomerOption {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
}

interface EquipmentOption {
  id: string;
  equipment_type: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  customer_id: string;
}

interface ServiceReportBuilderProps {
  reportId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const STEPS = [
  'Equipment',
  'Warranty',
  'Problem',
  'System Impact',
  'Repair Plans',
  'Upgrades',
  'Photos/Videos',
  'Review',
];

const EQUIPMENT_TYPES = [
  'Air Conditioner',
  'Heat Pump',
  'Furnace',
  'Mini Split',
  'Package Unit',
  'Boiler',
  'Water Heater',
  'Thermostat',
  'Ductwork',
  'Other',
];

const REFRIGERANT_TYPES = ['R-410A', 'R-22', 'R-32', 'R-134a', 'R-407C', 'R-404A', 'Other'];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];

const SYMPTOM_OPTIONS = [
  'Not cooling',
  'Not heating',
  'Weak airflow',
  'Strange noises',
  'Water leak',
  'Refrigerant leak',
  'Short cycling',
  'High energy bills',
  'Uneven temperatures',
  'Bad odor',
  'Ice buildup',
  'Thermostat issues',
  'Electrical issues',
  'Vibration',
  'Compressor failure',
];

const IMPACT_CATEGORIES = [
  { key: 'efficiency', label: 'Energy Efficiency', icon: Zap, desc: 'How much energy is being wasted' },
  { key: 'safety', label: 'Safety', icon: Shield, desc: 'Risk to occupants and property' },
  { key: 'comfort', label: 'Comfort', icon: Thermometer, desc: 'Impact on indoor comfort levels' },
  { key: 'lifespan', label: 'Equipment Lifespan', icon: Clock, desc: 'Effect on equipment longevity' },
  { key: 'energy_cost', label: 'Energy Cost', icon: Heart, desc: 'Impact on monthly utility bills' },
];

const EMPTY_EQUIPMENT_INFO = {
  equipment_type: '',
  make: '',
  model: '',
  serial_number: '',
  location: '',
  age: '',
  tonnage: '',
  refrigerant_type: '',
  condition: '',
};

const EMPTY_WARRANTY_INFO = {
  has_warranty: false,
  warranty_type: '',
  provider: '',
  expiration: '',
  coverage: '',
  notes: '',
};

const EMPTY_PROBLEM_DETAILS: { severity: 'low' | 'medium' | 'high' | 'critical'; symptoms: string[]; area_affected: string } = {
  severity: 'medium',
  symptoms: [],
  area_affected: '',
};

const EMPTY_IMPACT_DETAILS = {
  efficiency: 3,
  safety: 3,
  comfort: 3,
  lifespan: 3,
  energy_cost: 3,
};

function createEmptyRepairOption(label: string): RepairOption {
  return {
    label,
    name: '',
    line_items: [{ description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    benefits: [''],
    timeline: '',
    is_recommended: false,
  };
}

function createEmptyUpgrade(): UpgradeItem {
  return { name: '', price: 0, priority: 'medium', benefits: [''] };
}

export function ServiceReportBuilder({ reportId, onClose, onSaved }: ServiceReportBuilderProps) {
  const { groupId, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(reportId || null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  const lastSavedRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [equipmentInfo, setEquipmentInfo] = useState(EMPTY_EQUIPMENT_INFO);
  const [warrantyInfo, setWarrantyInfo] = useState(EMPTY_WARRANTY_INFO);
  const [problemFound, setProblemFound] = useState('');
  const [problemDetails, setProblemDetails] = useState(EMPTY_PROBLEM_DETAILS);
  const [systemImpact, setSystemImpact] = useState('');
  const [impactDetails, setImpactDetails] = useState(EMPTY_IMPACT_DETAILS);
  const [repairOptions, setRepairOptions] = useState<RepairOption[]>([createEmptyRepairOption('A')]);
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([]);
  const [techNotes, setTechNotes] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Media state
  const [media, setMedia] = useState<ServiceReportMedia[]>([]);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; caption: string; type: 'photo' | 'video' }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (groupId) {
      fetchCustomersAndEquipment();
      if (reportId) loadExistingReport(reportId);
    }
  }, [groupId, reportId]);

  // Auto-save every 30s
  useEffect(() => {
    if (!savedReportId) return;
    autoSaveTimerRef.current = setInterval(() => {
      const snapshot = JSON.stringify(getFormData());
      if (snapshot !== lastSavedRef.current) {
        saveDraft(true);
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [savedReportId, customerId, equipmentInfo, warrantyInfo, problemFound, problemDetails, systemImpact, impactDetails, repairOptions, upgrades, techNotes]);

  const fetchCustomersAndEquipment = async () => {
    const supabase = createClient();
    const [custRes, eqRes] = await Promise.all([
      supabase.from('customers').select('id, full_name, phone, address').eq('group_id', groupId!).order('full_name'),
      supabase.from('customer_equipment').select('id, equipment_type, make, model, serial_number, customer_id').eq('group_id', groupId!),
    ]);
    setCustomers(custRes.data || []);
    setEquipmentOptions(eqRes.data || []);
  };

  const loadExistingReport = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from('service_reports').select('*').eq('id', id).single();
    if (!data) return;

    setCustomerId(data.customer_id || '');
    setCustomerName(data.customer_name || '');
    setCustomerAddress(data.customer_address || '');
    setEquipmentId(data.equipment_id || '');
    setEquipmentInfo(data.equipment_info || EMPTY_EQUIPMENT_INFO);
    setWarrantyInfo(data.warranty_info || EMPTY_WARRANTY_INFO);
    setProblemFound(data.problem_found || '');
    setProblemDetails(data.problem_details || EMPTY_PROBLEM_DETAILS);
    setSystemImpact(data.system_impact || '');
    setImpactDetails(data.impact_details || EMPTY_IMPACT_DETAILS);
    setRepairOptions(data.repair_options?.length ? data.repair_options : [createEmptyRepairOption('A')]);
    setUpgrades(data.upgrades || []);
    setTechNotes(data.tech_notes || '');
    setServiceDate(data.service_date || new Date().toISOString().split('T')[0]);
    setSavedReportId(id);

    // Load media
    const { data: mediaData } = await supabase
      .from('service_report_media')
      .select('*')
      .eq('service_report_id', id)
      .order('sort_order');
    if (mediaData) setMedia(mediaData);
  };

  const getFormData = useCallback(() => ({
    customer_id: customerId || null,
    equipment_id: equipmentId || null,
    created_by: profile?.id || null,
    group_id: groupId!,
    equipment_info: equipmentInfo,
    warranty_info: warrantyInfo,
    problem_found: problemFound,
    problem_details: problemDetails,
    system_impact: systemImpact,
    impact_details: impactDetails,
    repair_options: repairOptions,
    upgrades,
    tech_notes: techNotes || null,
    customer_name: customerName || null,
    customer_address: customerAddress || null,
    service_date: serviceDate,
  }), [customerId, equipmentId, profile, groupId, equipmentInfo, warrantyInfo, problemFound, problemDetails, systemImpact, impactDetails, repairOptions, upgrades, techNotes, customerName, customerAddress, serviceDate]);

  const saveDraft = async (silent = false) => {
    if (!groupId) return;
    if (!silent) setSaving(true);
    const supabase = createClient();
    const formData = getFormData();
    const snapshot = JSON.stringify(formData);

    if (savedReportId) {
      await supabase
        .from('service_reports')
        .update({ ...formData, status: 'draft', updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', savedReportId);
    } else {
      const { data } = await supabase
        .from('service_reports')
        .insert({ ...formData, status: 'draft' } as Record<string, unknown>)
        .select('id')
        .single();
      if (data) setSavedReportId(data.id);
    }
    lastSavedRef.current = snapshot;
    if (!silent) {
      setSaving(false);
      onSaved();
    }
  };

  const generateReport = async () => {
    if (!groupId) return;
    setSaving(true);
    const supabase = createClient();
    const formData = getFormData();
    const shareToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    if (savedReportId) {
      await supabase
        .from('service_reports')
        .update({ ...formData, status: 'completed', share_token: shareToken, report_url: `/report/${shareToken}`, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', savedReportId);
    } else {
      const { data } = await supabase
        .from('service_reports')
        .insert({ ...formData, status: 'completed', share_token: shareToken, report_url: `/report/${shareToken}` } as Record<string, unknown>)
        .select('id')
        .single();
      if (data) setSavedReportId(data.id);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  // Customer selection handler
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const c = customers.find((c) => c.id === id);
    if (c) {
      setCustomerName(c.full_name);
      setCustomerAddress(c.address || '');
    }
    setEquipmentId('');
  };

  // Equipment selection handler
  const handleEquipmentSelect = (id: string) => {
    setEquipmentId(id);
    const eq = equipmentOptions.find((e) => e.id === id);
    if (eq) {
      setEquipmentInfo((prev) => ({
        ...prev,
        equipment_type: eq.equipment_type || prev.equipment_type,
        make: eq.make || prev.make,
        model: eq.model || prev.model,
        serial_number: eq.serial_number || prev.serial_number,
      }));
    }
  };

  // Repair option helpers
  const addRepairOption = () => {
    const labels = 'ABCDEFGHIJ';
    const next = labels[repairOptions.length] || `${repairOptions.length + 1}`;
    setRepairOptions([...repairOptions, createEmptyRepairOption(next)]);
  };

  const removeRepairOption = (idx: number) => {
    setRepairOptions(repairOptions.filter((_, i) => i !== idx));
  };

  const updateRepairOption = (idx: number, updates: Partial<RepairOption>) => {
    setRepairOptions(repairOptions.map((opt, i) => (i === idx ? { ...opt, ...updates } : opt)));
  };

  const addLineItem = (optIdx: number) => {
    const updated = [...repairOptions];
    updated[optIdx].line_items.push({ description: '', type: 'part', quantity: 1, unit_price: 0, total: 0 });
    setRepairOptions(updated);
  };

  const removeLineItem = (optIdx: number, itemIdx: number) => {
    const updated = [...repairOptions];
    updated[optIdx].line_items = updated[optIdx].line_items.filter((_, i) => i !== itemIdx);
    recalcSubtotal(updated, optIdx);
    setRepairOptions(updated);
  };

  const updateLineItem = (optIdx: number, itemIdx: number, field: keyof RepairLineItem, value: string | number) => {
    const updated = [...repairOptions];
    const item = { ...updated[optIdx].line_items[itemIdx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      item.total = Number(item.quantity) * Number(item.unit_price);
    }
    updated[optIdx].line_items[itemIdx] = item;
    recalcSubtotal(updated, optIdx);
    setRepairOptions(updated);
  };

  const recalcSubtotal = (options: RepairOption[], idx: number) => {
    options[idx].subtotal = options[idx].line_items.reduce((sum, li) => sum + li.total, 0);
  };

  // Upgrade helpers
  const addUpgrade = () => setUpgrades([...upgrades, createEmptyUpgrade()]);
  const removeUpgrade = (idx: number) => setUpgrades(upgrades.filter((_, i) => i !== idx));
  const updateUpgrade = (idx: number, updates: Partial<UpgradeItem>) => {
    setUpgrades(upgrades.map((u, i) => (i === idx ? { ...u, ...updates } : u)));
  };

  // Photo/video upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const files = Array.from(e.target.files || []);
    const newPending = files.map((file) => ({ file, caption: '', type }));
    setPendingFiles([...pendingFiles, ...newPending]);
    e.target.value = '';
  };

  const uploadPendingFiles = async () => {
    if (!savedReportId) {
      await saveDraft();
    }
    const reportIdToUse = savedReportId;
    if (!reportIdToUse || pendingFiles.length === 0) return;

    setUploading(true);
    const supabase = createClient();

    for (const pending of pendingFiles) {
      const ext = pending.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `service-reports/${reportIdToUse}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('service-reports').upload(filePath, pending.file);
      if (uploadError) continue;

      const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(filePath);

      const { data: mediaRow } = await supabase
        .from('service_report_media')
        .insert({
          service_report_id: reportIdToUse,
          type: pending.type,
          url: urlData.publicUrl,
          caption: pending.caption || null,
          sort_order: media.length,
        } as Record<string, unknown>)
        .select()
        .single();
      if (mediaRow) setMedia((prev) => [...prev, mediaRow]);
    }
    setPendingFiles([]);
    setUploading(false);
  };

  const deleteMedia = async (id: string, url: string) => {
    const supabase = createClient();
    await supabase.from('service_report_media').delete().eq('id', id);
    // Extract path from URL for storage deletion
    const pathMatch = url.match(/service-reports\/.+/);
    if (pathMatch) await supabase.storage.from('service-reports').remove([pathMatch[0]]);
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  // Step navigation with auto-save on first next
  const goNext = async () => {
    if (step === 1 && !savedReportId) {
      await saveDraft();
    }
    setStep(Math.min(step + 1, 8));
  };

  const goBack = () => setStep(Math.max(step - 1, 1));

  // Symptom toggle
  const toggleSymptom = (symptom: string) => {
    setProblemDetails((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  // Filter equipment by customer
  const filteredEquipment = customerId
    ? equipmentOptions.filter((e) => e.customer_id === customerId)
    : equipmentOptions;

  // === STEP RENDERERS ===

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Equipment Information</h3>

      {/* Customer selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
        <select
          value={customerId}
          onChange={(e) => handleCustomerChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </div>

      {/* Existing equipment selector */}
      {filteredEquipment.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Existing Equipment (optional)</label>
          <select
            value={equipmentId}
            onChange={(e) => handleEquipmentSelect(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select or enter manually...</option>
            {filteredEquipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.equipment_type} - {eq.make} {eq.model}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
          <select
            value={equipmentInfo.equipment_type}
            onChange={(e) => setEquipmentInfo({ ...equipmentInfo, equipment_type: e.target.value })}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select type...</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <Input label="Make" value={equipmentInfo.make} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, make: e.target.value })} />
        <Input label="Model" value={equipmentInfo.model} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, model: e.target.value })} />
        <Input label="Serial Number" value={equipmentInfo.serial_number} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, serial_number: e.target.value })} />
        <Input label="Location" placeholder="e.g. Rooftop, Attic, Garage" value={equipmentInfo.location} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, location: e.target.value })} />
        <Input label="Age (years)" type="number" value={equipmentInfo.age} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, age: e.target.value })} />
        <Input label="Tonnage" value={equipmentInfo.tonnage} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, tonnage: e.target.value })} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Refrigerant Type</label>
          <select
            value={equipmentInfo.refrigerant_type}
            onChange={(e) => setEquipmentInfo({ ...equipmentInfo, refrigerant_type: e.target.value })}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select refrigerant...</option>
            {REFRIGERANT_TYPES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setEquipmentInfo({ ...equipmentInfo, condition: c })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                equipmentInfo.condition === c
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Warranty Information</h3>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Has Warranty?</label>
        <button
          type="button"
          onClick={() => setWarrantyInfo({ ...warrantyInfo, has_warranty: !warrantyInfo.has_warranty })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            warrantyInfo.has_warranty ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              warrantyInfo.has_warranty ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {warrantyInfo.has_warranty && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Type</label>
            <select
              value={warrantyInfo.warranty_type}
              onChange={(e) => setWarrantyInfo({ ...warrantyInfo, warranty_type: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select type...</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="extended">Extended</option>
              <option value="home_warranty">Home Warranty</option>
              <option value="labor">Labor Only</option>
              <option value="parts">Parts Only</option>
              <option value="full">Full Coverage</option>
            </select>
          </div>
          <Input
            label="Provider"
            value={warrantyInfo.provider}
            onChange={(e) => setWarrantyInfo({ ...warrantyInfo, provider: e.target.value })}
          />
          <Input
            label="Expiration Date"
            type="date"
            value={warrantyInfo.expiration}
            onChange={(e) => setWarrantyInfo({ ...warrantyInfo, expiration: e.target.value })}
          />
          <Input
            label="Coverage Details"
            value={warrantyInfo.coverage}
            onChange={(e) => setWarrantyInfo({ ...warrantyInfo, coverage: e.target.value })}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Notes</label>
            <textarea
              value={warrantyInfo.notes}
              onChange={(e) => setWarrantyInfo({ ...warrantyInfo, notes: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Problem Found</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={problemFound}
          onChange={(e) => setProblemFound(e.target.value)}
          rows={4}
          placeholder="Describe the problem found during inspection..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
        <div className="flex flex-wrap gap-2">
          {(['low', 'medium', 'high', 'critical'] as const).map((sev) => {
            const colors: Record<string, string> = {
              low: 'bg-green-100 text-green-700 border-green-300',
              medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
              high: 'bg-orange-100 text-orange-700 border-orange-300',
              critical: 'bg-red-100 text-red-700 border-red-300',
            };
            const activeColors: Record<string, string> = {
              low: 'bg-green-600 text-white border-green-600',
              medium: 'bg-yellow-500 text-white border-yellow-500',
              high: 'bg-orange-600 text-white border-orange-600',
              critical: 'bg-red-600 text-white border-red-600',
            };
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setProblemDetails({ ...problemDetails, severity: sev })}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                  problemDetails.severity === sev ? activeColors[sev] : colors[sev]
                }`}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((symptom) => (
            <button
              key={symptom}
              type="button"
              onClick={() => toggleSymptom(symptom)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                problemDetails.symptoms.includes(symptom)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Area Affected"
        placeholder="e.g. Entire building, 2nd floor, Master bedroom"
        value={problemDetails.area_affected}
        onChange={(e) => setProblemDetails({ ...problemDetails, area_affected: e.target.value })}
      />
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">System Impact</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Why This Matters</label>
        <textarea
          value={systemImpact}
          onChange={(e) => setSystemImpact(e.target.value)}
          rows={3}
          placeholder="Explain to the customer why this problem matters and what could happen if left unaddressed..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Impact Ratings (1 = Low, 5 = Critical)</label>
        {IMPACT_CATEGORIES.map(({ key, label, icon: Icon, desc }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            <p className="text-xs text-gray-500 ml-6">{desc}</p>
            <div className="flex gap-1 ml-6">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setImpactDetails({ ...impactDetails, [key]: val })}
                  className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${
                    impactDetails[key as keyof typeof impactDetails] >= val
                      ? val <= 2
                        ? 'bg-green-500 text-white border-green-500'
                        : val <= 3
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Repair Plans</h3>
        <Button size="sm" variant="outline" onClick={addRepairOption}>
          <Plus className="w-4 h-4 mr-1" /> Add Option
        </Button>
      </div>

      {repairOptions.map((opt, optIdx) => (
        <Card key={optIdx}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {opt.label}
                </span>
                <Input
                  placeholder="Option name (e.g. Basic Repair)"
                  value={opt.name}
                  onChange={(e) => updateRepairOption(optIdx, { name: e.target.value })}
                  className="!mb-0"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated = repairOptions.map((o, i) => ({ ...o, is_recommended: i === optIdx }));
                    setRepairOptions(updated);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                    opt.is_recommended
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.is_recommended ? 'Recommended' : 'Set Recommended'}
                </button>
                {repairOptions.length > 1 && (
                  <button type="button" onClick={() => removeRepairOption(optIdx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              {opt.line_items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[150px]">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(optIdx, itemIdx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <select
                      value={item.type}
                      onChange={(e) => updateLineItem(optIdx, itemIdx, 'type', e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="part">Part</option>
                      <option value="labor">Labor</option>
                      <option value="flat_fee">Flat Fee</option>
                    </select>
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(optIdx, itemIdx, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(optIdx, itemIdx, 'unit_price', Number(e.target.value))}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-20 text-right py-2">
                    {formatCurrency(item.total)}
                  </span>
                  {opt.line_items.length > 1 && (
                    <button type="button" onClick={() => removeLineItem(optIdx, itemIdx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => addLineItem(optIdx)}>
                <Plus className="w-4 h-4 mr-1" /> Add Line Item
              </Button>
            </div>

            <div className="flex justify-end text-lg font-bold text-gray-900">
              Total: {formatCurrency(opt.subtotal)}
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Benefits</label>
              {opt.benefits.map((b, bIdx) => (
                <div key={bIdx} className="flex gap-2">
                  <Input
                    placeholder="e.g. Restores full cooling capacity"
                    value={b}
                    onChange={(e) => {
                      const updated = [...opt.benefits];
                      updated[bIdx] = e.target.value;
                      updateRepairOption(optIdx, { benefits: updated });
                    }}
                  />
                  {opt.benefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => updateRepairOption(optIdx, { benefits: opt.benefits.filter((_, i) => i !== bIdx) })}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => updateRepairOption(optIdx, { benefits: [...opt.benefits, ''] })}>
                <Plus className="w-4 h-4 mr-1" /> Add Benefit
              </Button>
            </div>

            <Input
              label="Timeline"
              placeholder="e.g. 2-3 hours, Same day"
              value={opt.timeline}
              onChange={(e) => updateRepairOption(optIdx, { timeline: e.target.value })}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Upgrades & Add-ons</h3>
        <Button size="sm" variant="outline" onClick={addUpgrade}>
          <Plus className="w-4 h-4 mr-1" /> Add Upgrade
        </Button>
      </div>

      {upgrades.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No upgrades added. Click &ldquo;Add Upgrade&rdquo; to suggest accessories or add-ons.</p>
      )}

      {upgrades.map((upg, idx) => (
        <Card key={idx}>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Input
                label="Name"
                placeholder="e.g. UV Light, Smart Thermostat"
                value={upg.name}
                onChange={(e) => updateUpgrade(idx, { name: e.target.value })}
              />
              <button type="button" onClick={() => removeUpgrade(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded ml-2 mt-5">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price"
                type="number"
                value={upg.price}
                onChange={(e) => updateUpgrade(idx, { price: Number(e.target.value) })}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={upg.priority}
                  onChange={(e) => updateUpgrade(idx, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Benefits</label>
              {upg.benefits.map((b, bIdx) => (
                <div key={bIdx} className="flex gap-2">
                  <Input
                    placeholder="Benefit"
                    value={b}
                    onChange={(e) => {
                      const updated = [...upg.benefits];
                      updated[bIdx] = e.target.value;
                      updateUpgrade(idx, { benefits: updated });
                    }}
                  />
                  {upg.benefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => updateUpgrade(idx, { benefits: upg.benefits.filter((_, i) => i !== bIdx) })}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => updateUpgrade(idx, { benefits: [...upg.benefits, ''] })}>
                <Plus className="w-4 h-4 mr-1" /> Add Benefit
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Photos & Videos</h3>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
          <Camera className="w-4 h-4 mr-2" /> Take Photo
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Upload Files
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelect(e, 'photo')}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            files.forEach((f) => {
              const type = f.type.startsWith('video') ? 'video' : 'photo';
              setPendingFiles((prev) => [...prev, { file: f, caption: '', type }]);
            });
            e.target.value = '';
          }}
        />
      </div>

      {/* Pending uploads */}
      {pendingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Ready to Upload ({pendingFiles.length})</h4>
          {pendingFiles.map((pf, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {pf.type === 'photo' ? (
                <img src={URL.createObjectURL(pf.file)} alt="" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Video</div>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-700 truncate">{pf.file.name}</p>
                <Input
                  placeholder="Add caption..."
                  value={pf.caption}
                  onChange={(e) => {
                    const updated = [...pendingFiles];
                    updated[idx].caption = e.target.value;
                    setPendingFiles(updated);
                  }}
                  className="mt-1"
                />
              </div>
              <button
                type="button"
                onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button onClick={uploadPendingFiles} isLoading={uploading}>
            <Upload className="w-4 h-4 mr-2" /> Upload All
          </Button>
        </div>
      )}

      {/* Uploaded media */}
      {media.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Uploaded ({media.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map((m) => (
              <div key={m.id} className="relative group">
                {m.type === 'photo' ? (
                  <img src={m.url} alt={m.caption || ''} className="w-full h-32 object-cover rounded-lg" />
                ) : (
                  <video src={m.url} className="w-full h-32 object-cover rounded-lg" />
                )}
                <button
                  type="button"
                  onClick={() => deleteMedia(m.id, m.url)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {m.caption && (
                  <p className="text-xs text-gray-600 mt-1 truncate">{m.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && pendingFiles.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No photos or videos yet. Use the buttons above to capture or upload.</p>
      )}
    </div>
  );

  const renderStep8 = () => {
    const selectedCustomer = customers.find((c) => c.id === customerId);
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Review & Submit</h3>

        {/* Equipment Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Equipment</h4>
              <button type="button" onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {selectedCustomer && <p className="col-span-2 text-gray-700"><span className="text-gray-500">Customer:</span> {selectedCustomer.full_name}</p>}
              {equipmentInfo.equipment_type && <p className="text-gray-700"><span className="text-gray-500">Type:</span> {equipmentInfo.equipment_type}</p>}
              {equipmentInfo.make && <p className="text-gray-700"><span className="text-gray-500">Make:</span> {equipmentInfo.make}</p>}
              {equipmentInfo.model && <p className="text-gray-700"><span className="text-gray-500">Model:</span> {equipmentInfo.model}</p>}
              {equipmentInfo.serial_number && <p className="text-gray-700"><span className="text-gray-500">Serial:</span> {equipmentInfo.serial_number}</p>}
              {equipmentInfo.condition && <p className="text-gray-700"><span className="text-gray-500">Condition:</span> {equipmentInfo.condition}</p>}
              {equipmentInfo.tonnage && <p className="text-gray-700"><span className="text-gray-500">Tonnage:</span> {equipmentInfo.tonnage}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Warranty Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Warranty</h4>
              <button type="button" onClick={() => setStep(2)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            <p className="text-sm text-gray-700">
              {warrantyInfo.has_warranty
                ? `${warrantyInfo.warranty_type || 'Yes'} - ${warrantyInfo.provider || 'Unknown provider'}${warrantyInfo.expiration ? ` (Exp: ${warrantyInfo.expiration})` : ''}`
                : 'No warranty'}
            </p>
          </CardContent>
        </Card>

        {/* Problem Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Problem Found</h4>
              <button type="button" onClick={() => setStep(3)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            <p className="text-sm text-gray-700">{problemFound || 'No description'}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                problemDetails.severity === 'critical' ? 'bg-red-100 text-red-700' :
                problemDetails.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                problemDetails.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {problemDetails.severity}
              </span>
              {problemDetails.symptoms.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{s}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Impact Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">System Impact</h4>
              <button type="button" onClick={() => setStep(4)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            {systemImpact && <p className="text-sm text-gray-700 mb-2">{systemImpact}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {IMPACT_CATEGORIES.map(({ key, label }) => (
                <div key={key} className="text-sm">
                  <span className="text-gray-500">{label}:</span>{' '}
                  <span className="font-medium">{impactDetails[key as keyof typeof impactDetails]}/5</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Repair Options Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Repair Plans ({repairOptions.length})</h4>
              <button type="button" onClick={() => setStep(5)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            <div className="space-y-2">
              {repairOptions.map((opt) => (
                <div key={opt.label} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">{opt.label}</span>
                    <span className="text-sm text-gray-700">{opt.name || 'Unnamed'}</span>
                    {opt.is_recommended && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Recommended</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(opt.subtotal)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upgrades Summary */}
        {upgrades.length > 0 && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Upgrades ({upgrades.length})</h4>
                <button type="button" onClick={() => setStep(6)} className="text-sm text-blue-600 hover:underline">Edit</button>
              </div>
              <div className="space-y-1">
                {upgrades.map((u, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{u.name || 'Unnamed'}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(u.price)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos Summary */}
        {media.length > 0 && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Photos/Videos ({media.length})</h4>
                <button type="button" onClick={() => setStep(7)} className="text-sm text-blue-600 hover:underline">Edit</button>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {media.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex-shrink-0">
                    {m.type === 'photo' ? (
                      <img src={m.url} alt={m.caption || ''} className="w-20 h-20 object-cover rounded" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Video</div>
                    )}
                  </div>
                ))}
                {media.length > 6 && (
                  <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
                    +{media.length - 6}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tech Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tech Notes (internal)</label>
          <textarea
            value={techNotes}
            onChange={(e) => setTechNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes for your team..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <Input
          label="Service Date"
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => saveDraft()} isLoading={saving}>
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button onClick={generateReport} isLoading={saving}>
            <Check className="w-4 h-4 mr-2" /> Generate Report
          </Button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-gray-900">Service Report</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => saveDraft()} isLoading={saving}>
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <button
                key={s}
                type="button"
                onClick={() => (isCompleted || isActive) && setStep(stepNum)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : <span>{stepNum}</span>}
                <span className="hidden sm:inline">{s}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full">
        {renderCurrentStep()}
      </div>

      {/* Footer Navigation */}
      {step < 8 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-gray-500">Step {step} of 8</span>
          <Button onClick={goNext}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
