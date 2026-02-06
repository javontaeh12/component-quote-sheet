'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function QuotePage() {
  useEffect(() => {
    // Initialize the form after the page loads
    const initForm = () => {
      if (typeof window !== 'undefined' && (window as unknown as Record<string, () => void>).initQuoteForm) {
        (window as unknown as Record<string, () => void>).initQuoteForm();
      }
    };

    // Small delay to ensure scripts are loaded
    setTimeout(initForm, 100);
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --primary: #1a3a5c;
          --primary-light: #2a5a8c;
          --accent: #c0392b;
          --bg: #eef1f5;
          --card: #ffffff;
          --border: #d0d5dd;
          --border-focus: #2a5a8c;
          --text: #1a1a2e;
          --text-muted: #667085;
          --input-bg: #f8f9fb;
          --section-bg: #f1f4f8;
          --success: #27ae60;
          --shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        /* Parts Autocomplete Styles */
        .part-autocomplete-wrapper {
          position: relative;
        }
        .part-autocomplete {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fff;
          border: 1.5px solid var(--border);
          border-top: none;
          border-radius: 0 0 8px 8px;
          max-height: 220px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: none;
        }
        .part-autocomplete.show {
          display: block;
        }
        .part-autocomplete-item {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.15s;
        }
        .part-autocomplete-item:last-child {
          border-bottom: none;
        }
        .part-autocomplete-item:hover,
        .part-autocomplete-item.selected {
          background: #f0f4f8;
        }
        .part-autocomplete-item .part-item-code {
          font-weight: 700;
          color: var(--primary);
          font-size: 13px;
        }
        .part-autocomplete-item .part-item-desc {
          color: var(--text);
          font-size: 12px;
          margin-top: 2px;
        }
        .part-autocomplete-item .part-item-cat {
          color: var(--text-muted);
          font-size: 10px;
          margin-top: 2px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg); padding: 0; color: var(--text);
          -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
        }
        .form-container { max-width: 940px; margin: 0 auto; background: var(--card); min-height: 100vh; }
        .form-header {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
          color: #fff; padding: 20px; display: flex; align-items: center;
          justify-content: space-between; position: sticky; top: 0; z-index: 100;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }
        .form-header h1 { font-size: 18px; font-weight: 700; }
        .form-header .subtitle { font-size: 11px; opacity: 0.75; margin-top: 2px; }
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .header-badge {
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
          padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
          line-height: 1.4;
        }
        .admin-link {
          background: none; border: none;
          padding: 4px 0; font-size: 9px; font-weight: 500;
          color: rgba(255,255,255,0.7);
          text-decoration: underline; text-underline-offset: 2px;
          transition: color 0.2s;
        }
        .admin-link:hover { color: #fff; }
        .form-body { padding: 16px; }
        .section { margin-bottom: 20px; }
        .section-header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
          padding-bottom: 8px; border-bottom: 2px solid var(--primary);
        }
        .section-header .section-icon {
          width: 26px; height: 26px; background: var(--primary); color: #fff;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .section-header h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--primary); }
        .section-header { justify-content: space-between; }
        .section-header-left { display: flex; align-items: center; gap: 8px; }
        .generate-btn {
          background: var(--primary); color: #fff; border: none; padding: 5px 12px;
          border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;
          text-transform: uppercase; letter-spacing: 0.5px; transition: background 0.2s;
          white-space: nowrap;
        }
        .generate-btn:hover { background: var(--primary-light); }
        .generate-btn:active { transform: scale(0.97); }
        .row { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .field { display: flex; flex-direction: column; flex: 1; min-width: 100%; }
        .field.half { min-width: calc(50% - 5px); }
        .field.third { min-width: calc(33.33% - 7px); }
        .field label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: var(--text-muted); }
        .field label .hint { font-weight: 400; text-transform: none; letter-spacing: 0; color: #98a2b3; font-size: 10px; }
        .field input, .field select, .field textarea {
          padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 8px;
          font-size: 16px; font-family: inherit; background: var(--input-bg); color: var(--text);
          transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none;
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(42,90,140,0.12); background: #fff;
        }
        .field input::placeholder, .field textarea::placeholder { color: #b0b8c4; }
        .field textarea { resize: vertical; min-height: 70px; line-height: 1.5; }
        .field select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667085' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px;
        }
        .page-group { display: flex; align-items: center; gap: 8px; }
        .page-group input {
          width: 60px; text-align: center; padding: 12px 8px; border: 1.5px solid var(--border);
          border-radius: 8px; font-size: 16px; font-family: inherit; background: var(--input-bg);
          color: var(--text); -webkit-appearance: none;
        }
        .page-group input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(42,90,140,0.12); background: #fff; }
        .page-group span { font-weight: 600; color: var(--text-muted); font-size: 14px; }
        .status-field { flex: 1; min-width: calc(50% - 5px); }
        .status-field label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: var(--text-muted); display: block; }
        .pill-group { display: flex; border-radius: 8px; overflow: hidden; border: 1.5px solid var(--border); }
        .pill-group input[type="radio"] { display: none; }
        .pill-group label.pill {
          flex: 1; text-align: center; padding: 12px 16px; font-size: 14px; font-weight: 600;
          cursor: pointer; background: var(--input-bg); color: var(--text-muted);
          transition: all 0.2s; margin: 0; border-right: 1px solid var(--border);
          -webkit-tap-highlight-color: transparent;
        }
        .pill-group label.pill:last-of-type { border-right: none; }
        .pill-group input[type="radio"]:checked + label.pill { background: var(--primary); color: #fff; }

        /* Mobile Parts Carousel */
        .parts-carousel { margin-top: 8px; }
        .part-card {
          background: var(--input-bg); border: 1.5px solid var(--border); border-radius: 12px;
          padding: 16px; display: none;
        }
        .part-card.active { display: block; }
        .part-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .part-card-header-left { display: flex; align-items: center; gap: 8px; }
        .part-card-num {
          background: var(--primary); color: #fff; width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;
        }
        .part-card-label { font-size: 13px; font-weight: 600; color: var(--text); }
        .part-card .remove-btn {
          background: #fef2f2; color: var(--accent); border: 1.5px solid #fecaca;
          font-size: 13px; padding: 6px 12px; cursor: pointer; border-radius: 6px;
          font-weight: 600; font-family: inherit; -webkit-tap-highlight-color: transparent;
        }
        .part-card-fields { display: flex; flex-direction: column; gap: 10px; }
        .part-card-fields .pf { display: flex; flex-direction: column; }
        .part-card-fields .pf label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px; }
        .part-card-fields .pf input {
          padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 8px;
          font-size: 16px; font-family: inherit; background: #fff; color: var(--text);
          -webkit-appearance: none;
        }
        .part-card-fields .pf input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(42,90,140,0.12); }
        .part-card-fields .pf input::placeholder { color: #c5cad2; }
        .part-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
        .part-nav-btn {
          flex: 1; padding: 12px; border: 1.5px solid var(--border); border-radius: 8px;
          background: #fff; color: var(--primary); font-size: 14px; font-weight: 600;
          font-family: inherit; cursor: pointer; text-align: center; -webkit-tap-highlight-color: transparent;
        }
        .part-nav-btn:disabled { opacity: 0.35; }
        .part-nav-dots { display: flex; gap: 6px; justify-content: center; padding: 0 8px; flex-wrap: wrap; max-width: 50%; }
        .part-nav-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); flex-shrink: 0; cursor: pointer; }
        .part-nav-dot.active { background: var(--primary); }

        /* Desktop table */
        .parts-wrapper { display: none; }
        .parts-table { width: 100%; border-collapse: collapse; }
        .parts-table thead th { background: var(--primary); color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 600; text-align: left; text-transform: uppercase; }
        .parts-table td { padding: 3px 4px; }
        .parts-table tbody tr { border-bottom: 1px solid #eef0f3; }
        .parts-table input { width: 100%; padding: 8px 10px; border: 1.5px solid transparent; border-radius: 4px; font-size: 13px; font-family: inherit; background: transparent; color: var(--text); }
        .parts-table input:focus { outline: none; border-color: var(--border-focus); background: #fff; }
        .parts-table .row-num { width: 30px; text-align: center; color: var(--text-muted); font-size: 11px; font-weight: 600; }
        .parts-table .remove-btn { background: none; color: #d0d5dd; border: none; cursor: pointer; padding: 4px 8px; font-size: 16px; }

        .table-actions { margin-top: 12px; }
        .add-row-btn {
          padding: 14px 20px; background: var(--section-bg); color: var(--primary);
          border: 1.5px dashed var(--border); border-radius: 8px; cursor: pointer;
          font-size: 14px; font-weight: 600; font-family: inherit; width: 100%; text-align: center;
          -webkit-tap-highlight-color: transparent;
        }

        /* Action Buttons */
        .actions {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          margin-top: 24px; padding-top: 20px; border-top: 1.5px solid #eef0f3;
        }
        .actions button {
          padding: 14px 12px; font-size: 13px; font-weight: 600; font-family: inherit;
          border: none; border-radius: 10px; cursor: pointer; display: flex;
          align-items: center; justify-content: center; gap: 6px;
          -webkit-tap-highlight-color: transparent;
        }
        .actions button:active { opacity: 0.8; }
        .btn-photo { background: #8e44ad; color: #fff; }
        .btn-photo:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-reset { background: #fff; color: var(--text-muted); border: 1.5px solid var(--border) !important; }
        .btn-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer { background: var(--section-bg); padding: 14px 16px; text-align: center; font-size: 10px; color: var(--text-muted); border-top: 1px solid #e4e7ec; }

        /* Print output styles */
        #printOutput {
          position: absolute; left: -9999px; top: 0;
          width: 816px; font-family: 'Inter', sans-serif; color: #1a1a2e; background: #fff;
        }
        #printOutput .po-header {
          background: #1a3a5c; color: #fff; padding: 24px 32px;
          display: flex; justify-content: space-between; align-items: center;
        }
        #printOutput .po-header h1 { font-size: 22px; font-weight: 700; }
        #printOutput .po-header .po-badge {
          background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);
          padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 1px;
        }
        #printOutput .po-body { padding: 24px 32px; }
        #printOutput .po-section { margin-bottom: 20px; }
        #printOutput .po-section-title {
          font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
          color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 6px; margin-bottom: 12px;
        }
        #printOutput .po-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        #printOutput .po-grid.three { grid-template-columns: 1fr 1fr 1fr; }
        #printOutput .po-field { margin-bottom: 6px; }
        #printOutput .po-field .po-label {
          font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
          color: #667085; margin-bottom: 2px;
        }
        #printOutput .po-field .po-value {
          font-size: 13px; font-weight: 500; color: #1a1a2e; padding: 4px 0;
          border-bottom: 1px solid #e4e7ec; min-height: 22px;
        }
        #printOutput .po-field.full { grid-column: 1 / -1; }
        #printOutput .po-field .po-value.multiline { white-space: pre-wrap; line-height: 1.5; }
        #printOutput .po-parts-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        #printOutput .po-parts-table th {
          background: #1a3a5c; color: #fff; padding: 8px 10px; font-size: 10px;
          font-weight: 600; text-transform: uppercase; text-align: left;
        }
        #printOutput .po-parts-table td { padding: 7px 10px; font-size: 12px; border-bottom: 1px solid #e4e7ec; }
        #printOutput .po-parts-table tr:nth-child(even) { background: #f8f9fb; }
        #printOutput .po-footer { text-align: center; padding: 12px; font-size: 9px; color: #98a2b3; border-top: 1px solid #e4e7ec; }

        /* Desktop overrides */
        @media (min-width: 768px) {
          body { padding: 30px 20px; }
          .form-container { border-radius: 12px; box-shadow: var(--shadow); min-height: auto; }
          .form-header { padding: 28px 40px; position: static; box-shadow: none; }
          .form-header h1 { font-size: 24px; }
          .header-badge { padding: 8px 16px; font-size: 12px; }
          .admin-link { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); padding: 8px 14px; border-radius: 5px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; color: #fff; }
          .admin-link:hover { background: rgba(255,255,255,0.3); }
          .form-body { padding: 32px 40px 40px; }
          .field { min-width: 170px; }
          .field.half, .field.third { min-width: 170px; }
          .field input, .field select, .field textarea { font-size: 14px; padding: 9px 12px; }
          .page-group input { font-size: 14px; padding: 9px 6px; width: 52px; }
          .pill-group label.pill { padding: 9px 16px; font-size: 13px; }
          .status-field { min-width: 170px; }
          .parts-carousel { display: none; }
          .parts-wrapper { display: block; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 8px; }
          .add-row-btn { width: auto; padding: 8px 20px; font-size: 13px; }
          .actions { display: flex; gap: 12px; justify-content: center; }
          .actions button { padding: 12px 32px; font-size: 14px; }
          .form-footer { padding: 16px 40px; font-size: 11px; }
        }
        @media print {
          body { background: #fff; padding: 0; }
          .form-container { display: none; }
          #printOutput { position: static !important; left: auto !important; display: block !important; }
        }
      `}</style>

      <div className="form-container" id="quoteForm">
        <div className="form-header">
          <div><h1>Quote Sheet</h1><div className="subtitle">HVAC / Refrigeration Service</div></div>
          <div className="header-actions">
            <a href="/login" className="admin-link">Admin Portal</a>
          </div>
        </div>
        <div className="form-body">

          <div className="section">
            <div className="section-header"><div className="section-icon">1</div><h2>Job Information</h2></div>
            <div className="row"><div className="field"><label>Customer Name</label><input type="text" id="customerName" placeholder="Enter customer name" /></div></div>
            <div className="row">
              <div className="field half"><label>Store #</label><input type="text" id="storeNumber" placeholder="Store #" /></div>
              <div className="field half"><label>WO Number</label><input type="text" id="woNumber" placeholder="Work order #" /></div>
            </div>
            <div className="row">
              <div className="field half"><label>Tech</label><input type="text" id="tech" placeholder="Technician name" /></div>
              <div className="field half"><label>Page</label><div className="page-group"><input type="text" id="pageNum" placeholder="#" /><span>of</span><input type="text" id="pageOf" placeholder="#" /></div></div>
            </div>
          </div>

          <div className="section">
            <div className="section-header"><div className="section-header-left"><div className="section-icon">2</div><h2>Equipment Details</h2></div><button type="button" className="generate-btn" id="generateBtn">Generate</button></div>
            <div className="row"><div className="field"><label>Equipment Type</label><input type="text" id="equipmentType" placeholder="e.g. RTU, Condenser, Walk-in Cooler" /></div></div>
            <div className="row"><div className="field">
              <label>Location</label>
              <select id="location"><option value="">-- Select Location --</option><option value="Roof">Roof</option><option value="Ground">Ground</option><option value="Self-Contained">Self-Contained</option></select>
            </div></div>
            <div className="row"><div className="field">
              <label>Manufacturer <span className="hint">- type to search or enter custom</span></label>
              <input type="text" id="manufacturer" list="mfgList" placeholder="Select or type manufacturer" autoComplete="off" />
              <datalist id="mfgList">
                <option value="AAON" /><option value="ADP (Advanced Distributor Products)" /><option value="Aire-Flo" /><option value="Amana" /><option value="American Standard" />
                <option value="Armstrong Air" /><option value="Bard Manufacturing" /><option value="Bosch" /><option value="Bryant" /><option value="Carrier" />
                <option value="Comfortmaker" /><option value="Daikin" /><option value="Dunham-Bush" /><option value="Friedrich" /><option value="Fujitsu" />
                <option value="Goodman" /><option value="Heil" /><option value="Honeywell" /><option value="ICP (International Comfort Products)" /><option value="Johnson Controls" />
                <option value="Lennox" /><option value="LG" /><option value="Luxaire" /><option value="Mammoth" /><option value="McQuay International" />
                <option value="Mitsubishi Electric" /><option value="Modine" /><option value="Nortek" /><option value="Payne" /><option value="Reznor" />
                <option value="Rheem" /><option value="Ruud" /><option value="Samsung" /><option value="Trane" /><option value="York" />
                <option value="Bally Refrigerated Boxes" /><option value="Beacon/Morris" /><option value="Bohn (Heatcraft)" /><option value="Bristol Compressors" />
                <option value="Climate Master" /><option value="Copeland (Emerson)" /><option value="Danfoss" /><option value="Embraco" /><option value="Heatcraft" />
                <option value="Hill Phoenix" /><option value="Hussmann" /><option value="KeepRite Refrigeration" /><option value="Kelvinator Commercial" />
                <option value="Kolpak" /><option value="Kramer Trenton" /><option value="Kysor/Warren" /><option value="Larkin (Heatcraft)" /><option value="Master-Bilt" />
                <option value="McCall" /><option value="Nor-Lake" /><option value="Randell" /><option value="Russell" /><option value="Sporlan" />
                <option value="Sub-Zero Commercial" /><option value="Tecumseh" /><option value="Traulsen" /><option value="True Manufacturing" /><option value="Turbo Air" />
                <option value="Tyler Refrigeration" /><option value="Victory Refrigeration" /><option value="Walk-In Cooler Warehouse" /><option value="Zero Zone" />
              </datalist>
            </div></div>
            <div className="row"><div className="field"><label>Unit</label><input type="text" id="unit" placeholder="Unit ID" /></div></div>
            <div className="row"><div className="field"><label>Model #</label><input type="text" id="modelNumber" placeholder="Model number" /></div></div>
            <div className="row"><div className="field"><label>Serial #</label><input type="text" id="serialNumber" placeholder="Serial number" /></div></div>
            <div className="row">
              <div className="field half"><label>Voltage</label><input type="text" id="voltage" placeholder="e.g. 208/230" /></div>
              <div className="field half"><label>Phase</label><input type="text" id="phase" placeholder="e.g. 1, 3" /></div>
            </div>
            <div className="row"><div className="field"><label>Refrigerant</label><input type="text" id="refrigerant" placeholder="e.g. R-410A, R-22" /></div></div>
            <div className="row">
              <div className="status-field"><label>Warranty</label><div className="pill-group"><input type="radio" name="warranty" id="warrantyYes" value="Yes" /><label className="pill" htmlFor="warrantyYes">Yes</label><input type="radio" name="warranty" id="warrantyNo" value="No" /><label className="pill" htmlFor="warrantyNo">No</label></div></div>
              <div className="status-field"><label>Operational</label><div className="pill-group"><input type="radio" name="operational" id="operationalYes" value="Yes" /><label className="pill" htmlFor="operationalYes">Yes</label><input type="radio" name="operational" id="operationalNo" value="No" /><label className="pill" htmlFor="operationalNo">No</label></div></div>
            </div>
          </div>

          <div className="section">
            <div className="section-header"><div className="section-icon">3</div><h2>Service Details</h2></div>
            <div className="row"><div className="field"><label>Job Information</label><textarea id="workPerformed" rows={3} placeholder="Describe job information..."></textarea></div></div>
            <div className="row"><div className="field"><label>Reason for Repair</label><textarea id="reasonForRepair" rows={3} placeholder="Describe reason for repair..."></textarea></div></div>
            <div className="row"><div className="field"><label>Work Performed</label><textarea id="equipmentNeeded" rows={2} placeholder="Describe work performed..."></textarea></div></div>
            <div className="row"><div className="field"><label>Equipment Needed <span className="hint">- scissor lift, duct jack, 40&apos; ladder, etc.</span></label><textarea id="otherComments" rows={2} placeholder="Scissor lift, duct jack, 40' ladder, etc."></textarea></div></div>
          </div>

          <div className="section">
            <div className="section-header"><div className="section-icon">4</div><h2>Logistics</h2></div>
            <div className="row">
              <div className="status-field"><label>Boom Truck Needed?</label><div className="pill-group"><input type="radio" name="boomTruck" id="boomYes" value="Yes" /><label className="pill" htmlFor="boomYes">Yes</label><input type="radio" name="boomTruck" id="boomNo" value="No" /><label className="pill" htmlFor="boomNo">No</label></div></div>
              <div className="status-field"><label>Trailer Needed?</label><div className="pill-group"><input type="radio" name="trailerNeeded" id="trailerYes" value="Yes" /><label className="pill" htmlFor="trailerYes">Yes</label><input type="radio" name="trailerNeeded" id="trailerNo" value="No" /><label className="pill" htmlFor="trailerNo">No</label></div></div>
            </div>
            <div className="row">
              <div className="field third"><label>Up</label><input type="text" id="boomUp" placeholder="ft" /></div>
              <div className="field third"><label>In</label><input type="text" id="boomIn" placeholder="ft" /></div>
              <div className="field third"><label>Set Back</label><input type="text" id="boomSetBack" placeholder="ft" /></div>
            </div>
            <div className="row">
              <div className="field third"><label>Tech Hours</label><input type="text" id="techHours" placeholder="Hrs" /></div>
              <div className="field third"><label>Helper</label><input type="text" id="helperHours" placeholder="Hrs" /></div>
              <div className="field third"><label>Travel</label><input type="text" id="travelHours" placeholder="Hrs" /></div>
            </div>
          </div>

          <div className="section">
            <div className="section-header"><div className="section-icon">5</div><h2>Parts &amp; Materials</h2></div>
            <div className="parts-carousel" id="partsCarousel">
              <div className="parts-list" id="partsList"></div>
              <div className="part-nav" id="partNav" style={{ display: 'none' }}>
                <button className="part-nav-btn" id="partPrev">&larr; Prev</button>
                <div className="part-nav-dots" id="partDots"></div>
                <button className="part-nav-btn" id="partNext">Next &rarr;</button>
              </div>
            </div>
            <div className="parts-wrapper">
              <table className="parts-table" id="partsTable"><thead><tr>
                <th style={{ width: '30px' }}>#</th><th>Description</th><th style={{ width: '140px' }}>Part #</th>
                <th style={{ width: '80px' }}>Qty</th><th style={{ width: '110px' }}>Cost</th><th style={{ width: '130px' }}>Vendor</th><th style={{ width: '36px' }}></th>
              </tr></thead><tbody id="partsBody"></tbody></table>
            </div>
            <div className="table-actions">
              <button className="add-row-btn" type="button" id="addPartBtn">+ Add Part</button>
              <div id="partCount" style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#667085', fontWeight: 500 }}></div>
            </div>
          </div>

          <div className="actions">
            <button className="btn-photo" id="savePhotoBtn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4.5A1.5 1.5 0 013.5 3h1.172a1.5 1.5 0 011.06.44L6.94 4.646A.5.5 0 007.293 4.5H12.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> Photo</button>
            <button className="btn-reset" id="resetBtn"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2v4.5h4.5M14 14v-4.5H9.5M1.5 10a6.5 6.5 0 0111.48-3M14.5 6a6.5 6.5 0 01-11.48 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Reset</button>
          </div>
        </div>
        <div className="form-footer">All fields auto-save. Your data will be here when you come back.</div>
      </div>

      <div id="printOutput"></div>

      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" strategy="beforeInteractive" />

      <Script id="quote-form-script" strategy="afterInteractive">{`
        const STORAGE_KEY = 'componentQuoteSheet';
        let rowCount = 0, isRestoring = false, currentPartIndex = 0;

        // Parts Database for autocomplete
        const PARTS_DATABASE = [
          { item: "10RC", description: "10X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "125RC", description: "12.5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "15RC", description: "15X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "20RC", description: "20X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "25RC", description: "25X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "30RC", description: "30X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "35RC", description: "35X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "40RC", description: "40X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "45RC", description: "45X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "50RC", description: "50X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "5RC", description: "5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "75RC", description: "7.5X440 OVAL RUN CAPACITOR", category: "Capacitors" },
          { item: "RC55", description: "55X440 MFD RUN CAPACITOR", category: "Capacitors" },
          { item: "355RCD", description: "35/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "405RCD", description: "40/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "445RCD", description: "44/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "555RCD", description: "55/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "805RCD", description: "80/5 MFD 440/370V DUAL RUN CAP", category: "Capacitors" },
          { item: "SC108250", description: "108/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC124250", description: "124/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC130250", description: "130/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC189250", description: "189/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC233250", description: "233/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC88250", description: "88/250 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "SC88330", description: "88/330 ROUND START CAPACITOR", category: "Capacitors" },
          { item: "12C90LR", description: "1/2 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "12C90LRST", description: "1/2 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "12CC", description: "1/2 COPPER COUPLING", category: "Copper Fittings" },
          { item: "12CT", description: "1/2 COPPER TEE", category: "Copper Fittings" },
          { item: "34C90LR", description: "3/4 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "34C90LRST", description: "3/4 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "34CC", description: "3/4 COPPER COUPLING", category: "Copper Fittings" },
          { item: "34CT", description: "3/4 COPPER TEE", category: "Copper Fittings" },
          { item: "38C90LR", description: "3/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "38C90LRST", description: "3/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "38CC", description: "3/8 COPPER COUPLING", category: "Copper Fittings" },
          { item: "38CT", description: "3/8 COPPER TEE", category: "Copper Fittings" },
          { item: "58C90LR", description: "5/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "58C90LRST", description: "5/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "58CC", description: "5/8 COPPER COUPLING", category: "Copper Fittings" },
          { item: "58CT", description: "5/8 COPPER TEE", category: "Copper Fittings" },
          { item: "78C90LR", description: "7/8 LONG RADIUS COPPER 90", category: "Copper Fittings" },
          { item: "78C90LRST", description: "7/8 LONG RADIUS STREET COPPER 90", category: "Copper Fittings" },
          { item: "78CC", description: "7/8 COPPER COUPLING", category: "Copper Fittings" },
          { item: "78CT", description: "7/8 COPPER TEE", category: "Copper Fittings" },
          { item: "1PVC90", description: "ELBOW PVC 1", category: "PVC Fittings" },
          { item: "1PVCCOUP", description: "COUPLING PVC 1", category: "PVC Fittings" },
          { item: "1PVCMPTAD", description: "ADAPTER PVC SXMPT 1", category: "PVC Fittings" },
          { item: "1PVCPIPE", description: "PIPE PVC 1 X 10 FT SCH 40", category: "PVC Fittings" },
          { item: "1PVCTEE", description: "1 PVC TEES", category: "PVC Fittings" },
          { item: "34PVC90", description: "ELBOW PVC 3/4", category: "PVC Fittings" },
          { item: "34PVCCAP", description: "3/4 PVC CAP", category: "PVC Fittings" },
          { item: "34PVCCOUP", description: "COUPLING PVC 3/4", category: "PVC Fittings" },
          { item: "34PVCFPTAD", description: "ADAPTER PVC SXFPT 3/4", category: "PVC Fittings" },
          { item: "34PVCMPTAD", description: "ADAPTER PVC SXMPT 3/4", category: "PVC Fittings" },
          { item: "34PVCPIPE", description: "PIPE PVC 3/4 X 10 FT SCH 40", category: "PVC Fittings" },
          { item: "34PVCTEE", description: "3/4 PVC TEES", category: "PVC Fittings" },
          { item: "34PVCUNION", description: "3/4 X 3/4 PVC SLIP UNION", category: "PVC Fittings" },
          { item: "1216SWBFD", description: "1/2 X 16CI SW BI-FLOW DRIER", category: "Driers" },
          { item: "148SWD", description: "1/4 X 8CI SW DRIERS", category: "Driers" },
          { item: "3816SWD", description: "3/8 X 16CI SW DRIER", category: "Driers" },
          { item: "388SWD", description: "3/8 X 8CI SW DRIER", category: "Driers" },
          { item: "EPADR", description: "RECOVERY DRIER 032MF", category: "Driers" },
          { item: "20FUSE250V", description: "FUSE 20 AMP 250V", category: "Fuses" },
          { item: "30FUSE250V", description: "FUSE 30 AMP 250V", category: "Fuses" },
          { item: "30FUSE600V", description: "FUSE 30 AMP 600V", category: "Fuses" },
          { item: "40FUSE250V", description: "FUSE 40 AMP 250V", category: "Fuses" },
          { item: "40FUSE600V", description: "FUSE 40 AMP 600V", category: "Fuses" },
          { item: "50FUSE250V", description: "FUSE 50 AMP 250V", category: "Fuses" },
          { item: "50FUSE600V", description: "FUSE 50 AMP 600V", category: "Fuses" },
          { item: "60FUSE250V", description: "FUSE 60 AMP 250V", category: "Fuses" },
          { item: "60FUSE600V", description: "FUSE 60 AMP 600V", category: "Fuses" },
          { item: "3FUSEATC", description: "FUSE 3 AMP ATC BLADE", category: "Fuses" },
          { item: "5FUSEATC", description: "FUSE 5 AMP ATC BLADE", category: "Fuses" },
          { item: "2P40A120V", description: "40A 2P 120V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "2P40A240V", description: "40A 2P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "2P40A24V", description: "40A 2P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P40A120V", description: "40A 3P 120V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P40A240V", description: "40A 3P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P40A24V", description: "40A 3P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P60A240V", description: "60A 3P 240V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "3P60A24V", description: "60A 3P 24V INDUSTRIAL CONTACTOR", category: "Contactors" },
          { item: "35WM", description: "35W CW 115 GE", category: "Motors" },
          { item: "6WM", description: "6W CW 115 GE MOTOR", category: "Motors" },
          { item: "9WM", description: "9W CW 115 GE MOTOR", category: "Motors" },
          { item: "CFM12230", description: "CFM 1/2 TE 230 1075", category: "Motors" },
          { item: "CFM12460", description: "CFM 1/2 TE 460 1075", category: "Motors" },
          { item: "CFM13230850", description: "CFM 1/3 TE 230 850 RPM", category: "Motors" },
          { item: "CFM14230", description: "CFM 1/4 TE 230 1075", category: "Motors" },
          { item: "CFM34230", description: "CFM 3/4 TE 230 1075", category: "Motors" },
          { item: "MTRRESC115230", description: "RESCUE MOTOR 115 230 VOLT", category: "Motors" },
          { item: "RM120115CWSEB", description: "MOTOR 1/20 115V CWSE BOHN", category: "Motors" },
          { item: "STR6WFANMO23", description: "STRU 6W FAN MOTOR 23", category: "Motors" },
          { item: "STREVAPMO", description: "EVAPORATOR FAN MOTOR", category: "Motors" },
          { item: "TRUMOTOR", description: "TRUE MOTOR COND ESP-L16EM1 16W", category: "Motors" },
          { item: "R290", description: "R290 (14 OZ - USE PER OZ)", category: "Refrigerants" },
          { item: "R404", description: "R404A LB", category: "Refrigerants" },
          { item: "R407C", description: "R407C LB", category: "Refrigerants" },
          { item: "R410A", description: "R410A LB", category: "Refrigerants" },
          { item: "R448A", description: "R448A REFRIGERANT PER POUND", category: "Refrigerants" },
          { item: "R513A", description: "R513A LB", category: "Refrigerants" },
          { item: "SW120", description: "RELAY SWITCHING 90-341 120V", category: "Relays" },
          { item: "SW24", description: "RELAY SWITCHING 90-340 24V", category: "Relays" },
          { item: "SW240", description: "RELAY SWITCHING 90-342 240V", category: "Relays" },
          { item: "PR90380", description: "RELAY PEANUT 90-380", category: "Relays" },
          { item: "SSHREL220", description: "SOLID STATE HARDSTART RELAY 220-240VAC", category: "Relays" },
          { item: "HSR5", description: "RELAY HARDSTART TO-5", category: "Relays" },
          { item: "HS", description: "HEAT SEQUENCER", category: "Relays" },
          { item: "HPC", description: "CONTROL HIGH PRESSURE - P70AA-118C", category: "Pressure Controls" },
          { item: "HPCOND", description: "HIGH PRESSURE COND FAN CYCLING CONTROL", category: "Pressure Controls" },
          { item: "HPS", description: "HP SCREW ON SWITCH 3100-103", category: "Pressure Controls" },
          { item: "HPSA", description: "HIGH PRESSURE CONTROL SWITCH", category: "Pressure Controls" },
          { item: "LPS", description: "LP SCREW ON SWITCH 3100-002", category: "Pressure Controls" },
          { item: "LPSA", description: "LOW PRESSURE CONTROL SWITCH", category: "Pressure Controls" },
          { item: "MSTAT", description: "WHITE ROGERS THERMOSTAT 1F56-444", category: "Thermostats" },
          { item: "MTSTAT", description: "STAT MED TEMP A30-261 CONTROLLER", category: "Thermostats" },
          { item: "WISTAT", description: "STAT WALKIN A19ABC-24C", category: "Thermostats" },
          { item: "T32PCLIENT", description: "CLIENT T STAT", category: "Thermostats" },
          { item: "IRTS-CLIENT", description: "INDOOR REMOTE TEMP SENSOR FOR T32", category: "Thermostats" },
          { item: "STRCARELDI", description: "STRU CAREL DISCHARGE/AIR PROBE", category: "Sensors" },
          { item: "STRDEFSEN", description: "STRU SB5766 DEFROST SENSOR", category: "Sensors" },
          { item: "VENCT414", description: "VENSTAR COMMUNICATING T/STAT", category: "Venstar" },
          { item: "VENECP4003", description: "VENSTAR EQUIP CONTROL PAC", category: "Venstar" },
          { item: "VENRS400", description: "VENSTAR REMOTE SEN-20 THERMISTOR", category: "Venstar" },
          { item: "VENRS410", description: "VENSTAR REMOTE SENSOR-WALL MOUNT", category: "Venstar" },
          { item: "VENRS420", description: "VENSTAR REMOTE SENSOR (BOH TUBE)", category: "Venstar" },
          { item: "VENSP400", description: "VENSTAR SENSOR PAC", category: "Venstar" },
          { item: "VENTIB515", description: "VENSTAR TRANE INTERFACE BOARD", category: "Venstar" },
          { item: "40VAT", description: "TRANSFORMER 40VA", category: "Transformers" },
          { item: "75VAT", description: "TRANSFORMER FUSED 75VA", category: "Transformers" },
          { item: "EBC10", description: "BUTT CONNECTOR #10", category: "Electrical" },
          { item: "EFC10", description: "FEMALE TERMINAL #10", category: "Electrical" },
          { item: "ETBC1614", description: "ELEC. BUTT CONNECTOR 16-14 EACH", category: "Electrical" },
          { item: "ETBC2218", description: "ELEC. BUTT CONNECTOR 22-18 EACH", category: "Electrical" },
          { item: "ETFC1210", description: "ELEC. FEMALE CONNECTOR 12-10 EACH", category: "Electrical" },
          { item: "ETFC1814", description: "ELEC. FEMALE CONNECTOR FLAG 18-14", category: "Electrical" },
          { item: "ETFCV1614", description: "ELEC. FEMALE CONNECTOR VINYL 16-14", category: "Electrical" },
          { item: "ETFORK1210", description: "ELEC. TERMINAL FORK 12-10 EACH", category: "Electrical" },
          { item: "ETFORK1614", description: "ELEC. TERMINAL FORK 16-14 EACH", category: "Electrical" },
          { item: "ETMFMST", description: "ELEC. MALE/FEMALE MULTISTACK", category: "Electrical" },
          { item: "ETPTC1810", description: "ELEC. PIGTAIL CONNECTOR 18-10", category: "Electrical" },
          { item: "ETPTC2214", description: "ELEC. PIGTAIL CONNECTOR 22-14", category: "Electrical" },
          { item: "ETRING1210", description: "ELEC. TERMINAL RING 12-10 EACH", category: "Electrical" },
          { item: "ETRING1614", description: "ELEC. TERMINAL RING 16-14 EACH", category: "Electrical" },
          { item: "WNBLUE", description: "WIRE NUTS BLUE EACH", category: "Electrical" },
          { item: "WNORANGE", description: "WIRE NUTS ORANGE EACH", category: "Electrical" },
          { item: "WNRED", description: "WIRE NUTS RED EACH", category: "Electrical" },
          { item: "WNYELLOW", description: "WIRE NUTS YELLOW EACH", category: "Electrical" },
          { item: "WT11BL", description: "WIRE TIES 11 BLACK EACH", category: "Electrical" },
          { item: "THHN10", description: "WIRE THHN BLACK 10 GA PER FOOT", category: "Wire" },
          { item: "THHN12", description: "WIRE THHN BLACK 12 GA PER FOOT", category: "Wire" },
          { item: "THHN14", description: "WIRE THHN BLACK 14 GA PER FOOT", category: "Wire" },
          { item: "THHN8", description: "WIRE THHN BLACK 8 GA PER FOOT", category: "Wire" },
          { item: "LVW188", description: "LOW VOLTAGE WIRE 18-8 PER FT", category: "Wire" },
          { item: "SJC", description: "SJ CORD 12/3 PER FOOT", category: "Wire" },
          { item: "ICECLP", description: "ICE MACHINE CLEANER-PINT", category: "Ice Machine" },
          { item: "ICECONDFAN", description: "ICE CONFANMTR 208/230V", category: "Ice Machine" },
          { item: "ICECURTALA", description: "ICE CURTAIN LOWER ASSEMBLY", category: "Ice Machine" },
          { item: "ICEFLOATSK", description: "ICE FLOAT SWITCH KIT", category: "Ice Machine" },
          { item: "ICEFLOATVA", description: "ICE FLOAT VA", category: "Ice Machine" },
          { item: "ICEHARVEAS", description: "ICE HARVEST ASSIST 230V", category: "Ice Machine" },
          { item: "ICEMOTOFAN", description: "ICE MOTOR FAN 230V", category: "Ice Machine" },
          { item: "ICEPUMP230", description: "ICE H2O PUMP 230V", category: "Ice Machine" },
          { item: "ICERIBSWI", description: "ICE RIBBON SWITCH", category: "Ice Machine" },
          { item: "ICESWITFCY", description: "ICE SWITCH FAN CYCLE", category: "Ice Machine" },
          { item: "ICETIMERMO", description: "ICE TIMER MODULE", category: "Ice Machine" },
          { item: "ICETUBEWDI", description: "ICE TUBE WATER DISTRIBUTION", category: "Ice Machine" },
          { item: "ICEVALVEPU", description: "ICE VALVE PURGE 230", category: "Ice Machine" },
          { item: "ICEVALVEWATERIN", description: "VALVE WATER INLET 240V", category: "Ice Machine" },
          { item: "ICEWATERPUMPASS", description: "WATER PUMP ASSY", category: "Ice Machine" },
          { item: "TRUBTMHINAS", description: "TRUE BTM HINGE ASSEMBLY", category: "True Parts" },
          { item: "TRUCOLDCON", description: "TRUE COLD CONTROL TR", category: "True Parts" },
          { item: "TRUCTRLTEMP", description: "TRUE CONTROL TEMP", category: "True Parts" },
          { item: "TRUDRAINELBOW811501", description: "TRUE EVAP DRAIN ELBOW", category: "True Parts" },
          { item: "TRUDRNWICKPAD", description: "TRUE DRAIN PAN WICKING PAD", category: "True Parts" },
          { item: "TRUHEATERTUBE801849", description: "TRUE HEATER DRAIN TUBE", category: "True Parts" },
          { item: "TRULEDLIGSTR", description: "TRUE LED LIGHT STRIP", category: "True Parts" },
          { item: "TRULEDWIRHAR", description: "TRUE LED WIRE HARNESS", category: "True Parts" },
          { item: "TRULHCARTHIN", description: "TRUE LH CARTRIDGE HINGE", category: "True Parts" },
          { item: "TRUPIN", description: "TRUE PIN SWING DR HINGE SHFT/PIN", category: "True Parts" },
          { item: "TRURHCARTHIN", description: "TRUE RH CARTRIDGE HINGE", category: "True Parts" },
          { item: "TRUSCREW", description: "TRUE SCREWS SHELF STANDARD 10-32", category: "True Parts" },
          { item: "TRUSHELFCL", description: "TRUE SHELF CLIPS", category: "True Parts" },
          { item: "TRUTOPHIN", description: "TRUE DOOR HINGE KIT TOP RT OR LT", category: "True Parts" },
          { item: "TRUTOPHINAS", description: "TRUE TOP HINGE ASSEMBLY", category: "True Parts" },
          { item: "TRUUNIVCBIT25", description: "TRUE UNIV CNTRL BIT25 KIT", category: "True Parts" },
          { item: "TRUWICKING", description: "TRUE WICKING KIT CON", category: "True Parts" },
          { item: "STRPOWERSW", description: "STRU POWER SWITCH 2PST", category: "Strutherford" },
          { item: "STRWICK", description: "STRU WICKING MAT", category: "Strutherford" },
          { item: "FS", description: "FLOAT SWITCH 1502UR", category: "Switches" },
          { item: "FSO", description: "OVER FLOW SWITCH", category: "Switches" },
          { item: "FSP", description: "DRAIN PAN SWITCH", category: "Switches" },
          { item: "LS160", description: "LIMIT SWITCH 160", category: "Switches" },
          { item: "LS190", description: "LIMIT SWITCH 190", category: "Switches" },
          { item: "DTC814520", description: "CLOCK DEFROST 8145-20 230V", category: "Switches" },
          { item: "38LLS", description: "SOLENOID 3/8 SW", category: "Valves" },
          { item: "38SG", description: "SITE GLASS 3/8 M X F", category: "Valves" },
          { item: "LLSC120240", description: "SOLENOID COIL 120/240", category: "Valves" },
          { item: "UGV", description: "UNIVERSAL GAS VALVE", category: "Valves" },
          { item: "VALCAP", description: "FLARE CAPS 1/4 EACH", category: "Valves" },
          { item: "VCORE", description: "VALVE CORES CD4450B EACH", category: "Valves" },
          { item: "2R322D", description: "115V CONDENSATE PUMP", category: "Pumps" },
          { item: "PUMPASSYMINI", description: "PUMP ASSY MINIBULE 115V", category: "Pumps" },
          { item: "UNIVCPUMP110", description: "UNIV PUMP COND 110-250V", category: "Pumps" },
          { item: "HSIT", description: "HOT SURFACE IGNITORS TRANE", category: "Ignition" },
          { item: "UIIM", description: "UNIVERSAL INTERMITTENT IGNITION MODULE", category: "Ignition" },
          { item: "THCO60", description: "THERMOCOUPLES 60", category: "Ignition" },
          { item: "TDADOB", description: "TIME DELAY ADJ DOB", category: "Time Delays" },
          { item: "TDADOM", description: "TIME DELAY ADJ DOM", category: "Time Delays" },
          { item: "A26", description: "A26 BELT", category: "Belts" },
          { item: "A32", description: "A32 BELT", category: "Belts" },
          { item: "A35", description: "A35 BELT", category: "Belts" },
          { item: "A36", description: "A36 BELT", category: "Belts" },
          { item: "A38", description: "A38 BELT", category: "Belts" },
          { item: "A39", description: "A39 BELT", category: "Belts" },
          { item: "A40", description: "A40 BELT", category: "Belts" },
          { item: "A44", description: "A44 BELT", category: "Belts" },
          { item: "A47", description: "A47 BELT", category: "Belts" },
          { item: "A48", description: "A48 BELT", category: "Belts" },
          { item: "A49", description: "A49 BELT", category: "Belts" },
          { item: "A52", description: "A52 BELT", category: "Belts" },
          { item: "A53", description: "A53 BELT", category: "Belts" },
          { item: "A54", description: "A54 BELT", category: "Belts" },
          { item: "LNKBELTA", description: "LINK BELT A", category: "Belts" },
          { item: "LNKBELTB", description: "LINK BELT B", category: "Belts" },
          { item: "101STSCR", description: "10 X1 SELF TAPPING SCREWS (500)", category: "Hardware" },
          { item: "812STSCR", description: "8 X1/2 SELF TAPPING SCREWS (500)", category: "Hardware" },
          { item: "12NUT", description: "HEX NUT 1/2", category: "Hardware" },
          { item: "38FW", description: "FENDER WASHER 3/8", category: "Hardware" },
          { item: "38LW", description: "LOCK WASHER 3/8", category: "Hardware" },
          { item: "38NUT", description: "HEX NUT 3/8", category: "Hardware" },
          { item: "38NUTCOMP", description: "NUTS COMP 3/8 61-6", category: "Hardware" },
          { item: "ANC", description: "ANCHOR KIT 10 X 1-1/4 HEX EACH", category: "Hardware" },
          { item: "716X1HC", description: "HOSE CLAMP 7/16 X 1", category: "Hardware" },
          { item: "STRAP", description: "GALV. STRAP 1 FOOT", category: "Hardware" },
          { item: "PDT", description: "DUCT STRAPS 36 INCH", category: "Hardware" },
          { item: "14ACCTUBE", description: "ACCESS TUBES 1/4 CD3604", category: "Access Tubes" },
          { item: "18ACCTUBE", description: "ACCESS TUBES 1/8 CD3608", category: "Access Tubes" },
          { item: "316ACCTUBE", description: "ACCESS TUBES 3/16 CD3603", category: "Access Tubes" },
          { item: "15SS", description: "SOLDER 15% PER STICK", category: "Soldering" },
          { item: "45SS", description: "45% SILVER SOLDER", category: "Soldering" },
          { item: "ACE", description: "ACETYLENE PER USE", category: "Soldering" },
          { item: "OXY", description: "OXYGEN PER USE", category: "Soldering" },
          { item: "MAPGAS", description: "MAPP GAS 14.1OZ", category: "Soldering" },
          { item: "ALUROD", description: "ALUMINUM FLUX CORED RODS", category: "Soldering" },
          { item: "ACID", description: "ACID A WAY", category: "Chemicals" },
          { item: "ATK", description: "ACID TEST KIT QT2000", category: "Chemicals" },
          { item: "CCCL", description: "CONDENSER CLEANER CCL GALLON", category: "Chemicals" },
          { item: "ECCL", description: "EVAP CLEANER CCL PER USE 1/2 GAL", category: "Chemicals" },
          { item: "DEGR", description: "DEGREASER VIRGINIA 10", category: "Chemicals" },
          { item: "DSA", description: "SPRAY ADHESIVE PER CAN", category: "Chemicals" },
          { item: "LKDETBLU", description: "LEAK DETECTOR BIG BLUE PER USE", category: "Chemicals" },
          { item: "LLOCK", description: "LEAK LOCK EACH", category: "Chemicals" },
          { item: "NEVSEE", description: "NEVERSEEZE 8 OZ BRUSH TOP PER USE", category: "Chemicals" },
          { item: "PVCGLUE", description: "GLUE PVC 1/4 PT", category: "Chemicals" },
          { item: "PVCPRIMER", description: "PRIMER PVC 1/2 PT", category: "Chemicals" },
          { item: "CGP", description: "COLD GALVANIZED PAINT", category: "Chemicals" },
          { item: "GREASE", description: "GREASE CARTRIDGE", category: "Chemicals" },
          { item: "THTRAP", description: "HEAT PASTE THERMO TRAP PER USE", category: "Chemicals" },
          { item: "WASPSPRAY", description: "WASP/HORNET SPRAY", category: "Chemicals" },
          { item: "WD40", description: "WD40 11 OZ PER USE", category: "Chemicals" },
          { item: "VPO1QT", description: "VACUUM PUMP OIL 1 QT", category: "Chemicals" },
          { item: "ELECTAPE", description: "ELECTRICAL TAPE PER YARD", category: "Tape" },
          { item: "TTAPE", description: "TAPE TEFLON PER FOOT", category: "Tape" },
          { item: "BLDT", description: "DUCT TAPE 2 BLACK PER YARD", category: "Tape" },
          { item: "FODT", description: "DUCT TAPE FOIL 2-1/2 UL PER YARD", category: "Tape" },
          { item: "CTAPE", description: "TAPE CORK PER FOOT", category: "Tape" },
          { item: "FTAPE", description: "TAPE FOAM PER FOOT", category: "Tape" },
          { item: "SCL", description: "SAND CLOTH 1-1/2 IN PER FOOT", category: "Tape" },
          { item: "ABPA", description: "ABRASIVE PADS EA", category: "Tape" },
          { item: "PIPESEAL", description: "PIPE THREAD SEALANT", category: "Tape" },
          { item: "CAULKCL", description: "CAULKING CLEAR", category: "Tape" },
          { item: "BAT9", description: "BATTERY 9V ALKALINE", category: "Batteries" },
          { item: "BATAA", description: "BATTERY AA ALKALINE", category: "Batteries" },
          { item: "BATAAA", description: "BATTERY AAA ALKALINE", category: "Batteries" },
          { item: "NITRO", description: "NITROGEN 40", category: "Gases" },
          { item: "SCRUBS", description: "SCRUBS IN A BUCKET", category: "Shop Supplies" },
          { item: "SRAGS", description: "SHOP TOWELS", category: "Shop Supplies" },
          { item: "SPOIL", description: "ZOOM SPOUT OILER", category: "Shop Supplies" },
          { item: "KNB", description: "NUT & BOLT (FASTENER KIT)", category: "Shop Supplies" },
          { item: "SH503", description: "DRAIN LINE HEATER", category: "Drain" },
          { item: "PT", description: "PAN TABS EACH", category: "Drain" },
          { item: "SWTEE", description: "SWIVEL TEE", category: "Drain" },
          { item: "MP", description: "CORD END MALE", category: "Misc" },
          { item: "PHMON", description: "3 PHASE MONITOR", category: "Misc" }
        ];

        // Search parts for autocomplete (stock parts only)
        function searchParts(query) {
          if (!query || query.length < 1) return [];
          const lowerQuery = query.toLowerCase();
          return PARTS_DATABASE.filter(p =>
            p.item.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery)
          ).slice(0, 8);
        }

        // Currently active autocomplete dropdown
        let activeAutocomplete = null;
        let selectedAutocompleteIndex = -1;

        function createAutocomplete(input, partNumInput) {
          // Create wrapper if not exists — use the existing .pf parent instead of reparenting
          let wrapper = input.closest('.part-autocomplete-wrapper') || input.closest('.pf') || input.parentElement;
          if (!wrapper.classList.contains('part-autocomplete-wrapper')) {
            wrapper.classList.add('part-autocomplete-wrapper');
            wrapper.style.position = 'relative';
          }

          // Remove existing dropdown
          const existing = wrapper.querySelector('.part-autocomplete');
          if (existing) existing.remove();

          // Create dropdown
          const dropdown = document.createElement('div');
          dropdown.className = 'part-autocomplete';
          wrapper.appendChild(dropdown);

          return dropdown;
        }

        function showAutocomplete(input, partNumInput, results) {
          let wrapper = input.closest('.part-autocomplete-wrapper') || input.closest('.pf') || input.parentElement;
          let dropdown = wrapper.querySelector('.part-autocomplete');
          if (!dropdown) {
            dropdown = createAutocomplete(input, partNumInput);
          }

          if (results.length === 0) {
            dropdown.classList.remove('show');
            return;
          }

          dropdown.innerHTML = results.map((part, i) =>
            '<div class="part-autocomplete-item" data-index="' + i + '" data-item="' + part.item + '" data-desc="' + part.description + '">' +
              '<div class="part-item-code">' + part.item + (part.isCustom ? '<span class="custom-badge">CUSTOM</span>' : '') + '</div>' +
              '<div class="part-item-desc">' + part.description + '</div>' +
              '<div class="part-item-cat">' + (part.category || '') + '</div>' +
            '</div>'
          ).join('');

          dropdown.classList.add('show');
          activeAutocomplete = { dropdown, input, partNumInput, results };
          selectedAutocompleteIndex = -1;

          // Add click handlers
          dropdown.querySelectorAll('.part-autocomplete-item').forEach(item => {
            item.addEventListener('click', function() {
              selectAutocompleteItem(this);
            });
          });
        }

        function selectAutocompleteItem(item) {
          if (!activeAutocomplete) return;
          const desc = item.getAttribute('data-desc');
          const itemCode = item.getAttribute('data-item');

          activeAutocomplete.input.value = desc;
          if (activeAutocomplete.partNumInput) {
            activeAutocomplete.partNumInput.value = itemCode;
          }

          activeAutocomplete.dropdown.classList.remove('show');

          // Sync between card and table
          syncAllPartInputs(activeAutocomplete.input, desc, itemCode);
          saveForm();
          activeAutocomplete = null;
        }

        function hideAllAutocompletes() {
          document.querySelectorAll('.part-autocomplete').forEach(d => d.classList.remove('show'));
          activeAutocomplete = null;
        }

        function syncAllPartInputs(input, desc, itemCode) {
          // Check if input is in card or table
          const card = input.closest('.part-card');
          const tableRow = input.closest('tr');

          if (card) {
            // Input is in card, sync to table
            const row = card.dataset.row;
            const targetRow = document.querySelector('#partsBody tr[data-row="' + row + '"]');
            if (targetRow) {
              const tableInputs = targetRow.querySelectorAll('input');
              tableInputs[0].value = desc; // Description
              tableInputs[1].value = itemCode; // Part #
            }
          } else if (tableRow) {
            // Input is in table, sync to card
            const row = tableRow.dataset.row;
            const targetCard = document.querySelector('#partsList .part-card[data-row="' + row + '"]');
            if (targetCard) {
              const cardInputs = targetCard.querySelectorAll('input');
              cardInputs[0].value = desc; // Description
              cardInputs[1].value = itemCode; // Part #
            }
          }
        }

        // Keyboard navigation for autocomplete
        document.addEventListener('keydown', function(e) {
          if (!activeAutocomplete) return;

          const items = activeAutocomplete.dropdown.querySelectorAll('.part-autocomplete-item');
          if (items.length === 0) return;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, items.length - 1);
            items.forEach((item, i) => item.classList.toggle('selected', i === selectedAutocompleteIndex));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, 0);
            items.forEach((item, i) => item.classList.toggle('selected', i === selectedAutocompleteIndex));
          } else if (e.key === 'Enter' && selectedAutocompleteIndex >= 0) {
            e.preventDefault();
            selectAutocompleteItem(items[selectedAutocompleteIndex]);
          } else if (e.key === 'Escape') {
            hideAllAutocompletes();
          }
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', function(e) {
          if (!e.target.closest('.part-autocomplete-wrapper')) {
            hideAllAutocompletes();
          }
        });

        const fieldIds = [
          'customerName','storeNumber','woNumber','tech','pageNum','pageOf',
          'equipmentType','location','manufacturer','unit','modelNumber','serialNumber',
          'voltage','phase','refrigerant','workPerformed','reasonForRepair','equipmentNeeded',
          'otherComments','boomUp','boomIn','boomSetBack','techHours','helperHours','travelHours'
        ];
        const radioNames = ['warranty','operational','boomTruck','trailerNeeded'];

        function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
        function radioVal(name) { const c = document.querySelector('input[name="'+name+'"]:checked'); return c ? c.value : '—'; }
        function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

        function buildOutput() {
          const parts = [];
          document.querySelectorAll('#partsList .part-card').forEach(card => {
            const inputs = card.querySelectorAll('input');
            const r = { desc: inputs[0]?.value||'', part: inputs[1]?.value||'', qty: inputs[2]?.value||'', cost: inputs[3]?.value||'', vendor: inputs[4]?.value||'' };
            if (r.desc || r.part || r.qty || r.cost || r.vendor) parts.push(r);
          });

          const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
          const pageStr = val('pageNum') && val('pageOf') ? 'Page '+esc(val('pageNum'))+' of '+esc(val('pageOf')) : '';

          // Helper to create field HTML only if value exists
          function field(label, value, full) {
            if (!value || value.trim() === '') return '';
            return '<div class="po-field'+(full?' full':'')+'"><div class="po-label">'+label+'</div><div class="po-value'+(full?' multiline':'')+'">'+ esc(value) +'</div></div>';
          }
          function radioField(label, name) {
            const c = document.querySelector('input[name="'+name+'"]:checked');
            if (!c) return '';
            return '<div class="po-field"><div class="po-label">'+label+'</div><div class="po-value">'+c.value+'</div></div>';
          }

          // Build Job Info section
          let jobInfoFields = field('Customer Name', val('customerName')) + field('Store #', val('storeNumber')) + field('WO Number', val('woNumber')) + field('Technician', val('tech'));
          let jobInfoSection = jobInfoFields ? '<div class="po-section"><div class="po-section-title">Job Information</div><div class="po-grid">'+jobInfoFields+'</div>'+(pageStr ? '<div style="text-align:right;font-size:11px;color:#667085;margin-top:4px;">'+pageStr+'</div>' : '')+'</div>' : '';

          // Build Equipment Details section
          let equipFields = field('Equipment Type', val('equipmentType')) + field('Location', val('location')) + field('Manufacturer', val('manufacturer')) + field('Unit', val('unit')) + field('Model #', val('modelNumber')) + field('Serial #', val('serialNumber')) + field('Voltage', val('voltage')) + field('Phase', val('phase')) + field('Refrigerant', val('refrigerant')) + radioField('Warranty', 'warranty') + radioField('Operational', 'operational');
          let equipSection = equipFields ? '<div class="po-section"><div class="po-section-title">Equipment Details</div><div class="po-grid">'+equipFields+'</div></div>' : '';

          // Build Service Details section (with updated labels)
          let serviceFields = field('Job Information', val('workPerformed'), true) + field('Reason for Repair', val('reasonForRepair'), true) + field('Work Performed', val('equipmentNeeded'), true) + field('Equipment Needed', val('otherComments'), true);
          let serviceSection = serviceFields ? '<div class="po-section"><div class="po-section-title">Service Details</div><div class="po-grid">'+serviceFields+'</div></div>' : '';

          // Build Logistics section
          let logisticsFields = radioField('Boom Truck', 'boomTruck') + radioField('Trailer Needed', 'trailerNeeded') + field('Up', val('boomUp')) + field('In', val('boomIn')) + field('Set Back', val('boomSetBack')) + field('Tech Hours', val('techHours')) + field('Helper', val('helperHours')) + field('Travel', val('travelHours'));
          let logisticsSection = logisticsFields ? '<div class="po-section"><div class="po-section-title">Logistics</div><div class="po-grid three">'+logisticsFields+'</div></div>' : '';

          // Build Parts section
          let partsHTML = '';
          if (parts.length > 0) {
            partsHTML = '<div class="po-section"><div class="po-section-title">Parts & Materials</div><table class="po-parts-table"><thead><tr><th>#</th><th>Description</th><th>Part #</th><th>Qty</th><th>Cost</th><th>Vendor</th></tr></thead><tbody>';
            parts.forEach((p, i) => {
              partsHTML += '<tr><td>'+(i+1)+'</td><td>'+esc(p.desc)+'</td><td>'+esc(p.part)+'</td><td>'+esc(p.qty)+'</td><td>'+esc(p.cost)+'</td><td>'+esc(p.vendor)+'</td></tr>';
            });
            partsHTML += '</tbody></table></div>';
          }

          return {
            full: '<div class="po-header"><div><h1>Quote Sheet</h1><div style="font-size:11px;opacity:0.7;margin-top:3px;">HVAC / Refrigeration Service Documentation</div></div><div style="text-align:right;"><div class="po-badge">Service Quote</div><div style="font-size:10px;opacity:0.7;margin-top:6px;">'+today+'</div></div></div><div class="po-body">'+jobInfoSection+equipSection+serviceSection+logisticsSection+partsHTML+'</div><div class="po-footer">Quote Sheet — Generated '+today+'</div>',
            page1: '<div class="po-header"><div><h1>Quote Sheet</h1><div style="font-size:11px;opacity:0.7;margin-top:3px;">HVAC / Refrigeration Service Documentation</div></div><div style="text-align:right;"><div class="po-badge">Service Quote</div><div style="font-size:10px;opacity:0.7;margin-top:6px;">'+today+'</div></div></div><div class="po-body">'+jobInfoSection+equipSection+serviceSection+logisticsSection+'</div><div class="po-footer">Quote Sheet — Page 1 — Generated '+today+'</div>',
            page2: partsHTML ? '<div class="po-header"><div><h1>Quote Sheet</h1><div style="font-size:11px;opacity:0.7;margin-top:3px;">HVAC / Refrigeration Service Documentation</div></div><div style="text-align:right;"><div class="po-badge">Service Quote</div><div style="font-size:10px;opacity:0.7;margin-top:6px;">'+today+'</div></div></div><div class="po-body">'+partsHTML+'</div><div class="po-footer">Quote Sheet — Page 2 — Generated '+today+'</div>' : null,
            hasParts: parts.length > 0
          };
        }

        function getFilename(ext) {
          const c = val('customerName') || 'Quote';
          const w = val('woNumber');
          return 'Component_Quote_'+c.replace(/\\s+/g,'_')+(w ? '_WO'+w : '')+'.'+ext;
        }

        function triggerDownload(blob, filename, mimeType) {
          const url = URL.createObjectURL(blob);
          if (navigator.share && navigator.canShare) {
            try {
              const file = new File([blob], filename, { type: mimeType });
              if (navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: filename }).catch(() => window.open(url, '_blank'));
                return;
              }
            } catch(e) {}
          }
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }

        function captureOutput(html) {
          return new Promise(function(resolve, reject) {
            var output = document.getElementById('printOutput');
            output.innerHTML = html;
            output.style.left = '0'; output.style.position = 'fixed'; output.style.top = '0'; output.style.zIndex = '9999';
            setTimeout(function() {
              html2canvas(output, { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 }).then(function(canvas) {
                output.style.left = '-9999px'; output.style.position = 'absolute'; output.style.zIndex = '';
                resolve(canvas);
              }).catch(function(err) {
                output.style.left = '-9999px'; output.style.position = 'absolute'; output.style.zIndex = '';
                reject(err);
              });
            }, 100);
          });
        }

        var pendingPartsHTML = null;
        var photoOriginalHTML = null;

        function saveAsPhoto() {
          var btn = document.getElementById('savePhotoBtn');
          if (!photoOriginalHTML) photoOriginalHTML = btn.innerHTML;
          if (typeof html2canvas === 'undefined') {
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            s.onload = function() { saveAsPhoto(); };
            document.head.appendChild(s);
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-spinner"></span> Loading...';
            return;
          }

          // Step 2: save the parts page
          if (pendingPartsHTML) {
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-spinner"></span> Generating...';
            var partsHtml = pendingPartsHTML;
            var baseName = getFilename('png').replace('.png', '');
            pendingPartsHTML = null;
            captureOutput(partsHtml).then(function(canvas) {
              canvas.toBlob(function(blob) {
                triggerDownload(blob, baseName + '_Parts.png', 'image/png');
                btn.innerHTML = photoOriginalHTML;
                btn.disabled = false;
              }, 'image/png');
            }).catch(function() { btn.innerHTML = photoOriginalHTML; btn.disabled = false; });
            return;
          }

          // Step 1: render full output first, check if too tall
          btn.disabled = true;
          btn.innerHTML = '<span class="btn-spinner"></span> Generating...';
          var result = buildOutput();
          var baseName = getFilename('png').replace('.png', '');

          // Measure the full output height
          var output = document.getElementById('printOutput');
          output.innerHTML = result.full;
          output.style.left = '0'; output.style.position = 'fixed'; output.style.top = '0'; output.style.zIndex = '9999';
          var fullHeight = output.scrollHeight;
          output.style.left = '-9999px'; output.style.position = 'absolute'; output.style.zIndex = '';

          // If under 1400px tall or no parts, save as one image
          var isTooLong = fullHeight > 1400 && result.hasParts && result.page2;

          var pageToCapture = isTooLong ? result.page1 : result.full;
          var filename = isTooLong ? baseName + '_Page1.png' : baseName + '.png';

          captureOutput(pageToCapture).then(function(canvas) {
            canvas.toBlob(function(blob) {
              triggerDownload(blob, filename, 'image/png');
              if (isTooLong) {
                // Switch button to "Save Parts" for step 2
                pendingPartsHTML = result.page2;
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4.5A1.5 1.5 0 013.5 3h1.172a1.5 1.5 0 011.06.44L6.94 4.646A.5.5 0 007.293 4.5H12.5A1.5 1.5 0 0114 6v6.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg> Save Parts';
                btn.disabled = false;
              } else {
                btn.innerHTML = photoOriginalHTML;
                btn.disabled = false;
              }
            }, 'image/png');
          }).catch(function() { btn.innerHTML = photoOriginalHTML; btn.disabled = false; });
        }

        function saveForm() {
          if (isRestoring) return;
          const data = {};
          fieldIds.forEach(id => { data[id] = val(id); });
          radioNames.forEach(name => { const c = document.querySelector('input[name="'+name+'"]:checked'); data['radio_'+name] = c ? c.value : ''; });
          const parts = [];
          document.querySelectorAll('#partsList .part-card').forEach(card => {
            const inputs = card.querySelectorAll('input');
            const row = []; inputs.forEach(inp => row.push(inp.value)); parts.push(row);
          });
          data.parts = parts;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }

        function restoreForm() {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) { addPartRow(); return; }
          isRestoring = true;
          const data = JSON.parse(raw);
          fieldIds.forEach(id => { const el = document.getElementById(id); if (el && data[id] !== undefined) el.value = data[id]; });
          radioNames.forEach(name => { const v = data['radio_'+name]; if (v) { const r = document.querySelector('input[name="'+name+'"][value="'+v+'"]'); if (r) r.checked = true; } });
          if (data.parts && data.parts.length > 0) {
            data.parts.forEach(rowData => {
              addPartRow();
              const card = document.querySelector('#partsList .part-card:last-child');
              const ci = card.querySelectorAll('input');
              const tr = document.querySelector('#partsBody tr:last-child');
              const ti = tr.querySelectorAll('input');
              rowData.forEach((v,i) => { if(ci[i]) ci[i].value=v; if(ti[i]) ti[i].value=v; });
            });
          } else { addPartRow(); }
          isRestoring = false;
          updatePartView();
        }

        function addPartRow() {
          rowCount++;
          const n = rowCount;
          const total = document.querySelectorAll('#partsList .part-card').length + 1;

          const list = document.getElementById('partsList');
          const card = document.createElement('div');
          card.className = 'part-card'; card.dataset.row = n;
          card.innerHTML = '<div class="part-card-header"><div class="part-card-header-left"><div class="part-card-num">'+total+'</div><span class="part-card-label">Part '+total+'</span></div><button class="remove-btn" onclick="removeRow('+n+')">Remove</button></div><div class="part-card-fields"><div class="pf"><label>Description <span style="font-weight:400;color:#98a2b3;font-size:9px;">(type to search)</span></label><input type="text" placeholder="Start typing to search parts..." data-col="0"></div><div class="pf"><label>Part #</label><input type="text" placeholder="Auto-fills when selected" data-col="1"></div><div class="pf"><label>Quantity</label><input type="text" inputmode="numeric" placeholder="Enter quantity" data-col="2"></div><div class="pf"><label>Cost</label><input type="text" inputmode="decimal" placeholder="$0.00" data-col="3"></div><div class="pf"><label>Vendor</label><input type="text" placeholder="Enter vendor name" data-col="4"></div></div>';
          list.appendChild(card);

          const tbody = document.getElementById('partsBody');
          const tr = document.createElement('tr'); tr.dataset.row = n;
          tr.innerHTML = '<td class="row-num">'+total+'</td><td><input type="text" placeholder="Type to search..." data-col="0"></td><td><input type="text" placeholder="Part #" data-col="1"></td><td><input type="text" placeholder="Qty" data-col="2"></td><td><input type="text" placeholder="$0.00" data-col="3"></td><td><input type="text" placeholder="Vendor" data-col="4"></td><td style="text-align:center"><button class="remove-btn" onclick="removeRow('+n+')">&times;</button></td>';
          tbody.appendChild(tr);

          const ci = card.querySelectorAll('input'), ti = tr.querySelectorAll('input');

          // Add autocomplete to description inputs (data-col="0")
          const cardDescInput = ci[0];
          const cardPartNumInput = ci[1];
          const tableDescInput = ti[0];
          const tablePartNumInput = ti[1];

          // Card description autocomplete
          cardDescInput.addEventListener('input', function() {
            const results = searchParts(this.value);
            showAutocomplete(this, cardPartNumInput, results);
            if(ti[0]) ti[0].value = this.value;
            saveForm();
          });

          // Table description autocomplete
          tableDescInput.addEventListener('input', function() {
            const results = searchParts(this.value);
            showAutocomplete(this, tablePartNumInput, results);
            if(ci[0]) ci[0].value = this.value;
            saveForm();
          });

          // Sync other inputs normally
          ci.forEach((inp,i) => {
            if (i !== 0) { // Skip description, already handled
              inp.addEventListener('input', () => { if(ti[i]) ti[i].value=inp.value; saveForm(); });
            }
          });
          ti.forEach((inp,i) => {
            if (i !== 0) { // Skip description, already handled
              inp.addEventListener('input', () => { if(ci[i]) ci[i].value=inp.value; saveForm(); });
            }
          });

          if (!isRestoring) { currentPartIndex = document.querySelectorAll('#partsList .part-card').length - 1; saveForm(); }
          updatePartView();
        }

        function removeRow(n) {
          document.querySelector('#partsList .part-card[data-row="'+n+'"]')?.remove();
          document.querySelector('#partsBody tr[data-row="'+n+'"]')?.remove();
          renumberRows();
          const total = document.querySelectorAll('#partsList .part-card').length;
          if (total === 0) { addPartRow(); return; }
          if (currentPartIndex >= total) currentPartIndex = total - 1;
          updatePartView(); saveForm();
        }
        window.removeRow = removeRow;

        function renumberRows() {
          rowCount = 0;
          document.querySelectorAll('#partsList .part-card').forEach((card,i) => { rowCount=i+1; card.querySelector('.part-card-num').textContent=rowCount; card.querySelector('.part-card-label').textContent='Part '+rowCount; });
          document.querySelectorAll('#partsBody tr').forEach((tr,i) => { tr.querySelector('.row-num').textContent=i+1; });
        }

        function navigatePart(dir) {
          const total = document.querySelectorAll('#partsList .part-card').length;
          if (!total) return;
          currentPartIndex = Math.max(0, Math.min(total-1, currentPartIndex+dir));
          updatePartView();
        }

        function updatePartView() {
          const cards = document.querySelectorAll('#partsList .part-card');
          const total = cards.length;
          cards.forEach((c,i) => c.classList.toggle('active', i===currentPartIndex));
          const nav = document.getElementById('partNav');
          nav.style.display = total <= 1 ? 'none' : 'flex';
          const dots = document.getElementById('partDots'); dots.innerHTML = '';
          for (let i=0; i<total; i++) { const d=document.createElement('div'); d.className='part-nav-dot'+(i===currentPartIndex?' active':''); d.onclick=()=>{currentPartIndex=i;updatePartView();}; dots.appendChild(d); }
          document.getElementById('partPrev').disabled = currentPartIndex===0;
          document.getElementById('partNext').disabled = currentPartIndex>=total-1;
          const pc = document.getElementById('partCount');
          if (pc) pc.textContent = total > 0 ? total+' part'+(total!==1?'s':'')+' added' : '';
        }

        function resetForm() {
          if (confirm('Clear all fields? This cannot be undone.')) {
            document.querySelectorAll('.form-body input[type="text"], .form-body textarea').forEach(el => el.value='');
            document.querySelectorAll('.form-body select').forEach(el => el.selectedIndex=0);
            document.querySelectorAll('.form-body input[type="radio"]').forEach(el => el.checked=false);
            document.getElementById('partsList').innerHTML = '';
            document.getElementById('partsBody').innerHTML = '';
            rowCount = 0; currentPartIndex = 0;
            addPartRow();
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        function generateFromJobInfo() {
          var text = val('workPerformed');
          if (!text.trim()) { alert('Enter job information first, then click Generate.'); return; }

          var customerName = '';
          var storeNumber = '';
          var woNumber = '';
          var equipmentType = '';
          var unitId = '';
          var manufacturer = '';
          var modelNumber = '';
          var serialNumber = '';

          var lines = text.split('\\n').map(function(l) { return l.trim(); });
          var allText = text;

          // Customer name & store number: line with " - " separator
          // Format: "STBU013922 - STARBUCKS 13922"
          for (var i = 0; i < lines.length; i++) {
            var dashMatch = lines[i].match(/^\\S+\\s+-\\s+(.+)/);
            if (dashMatch) {
              var nameAndStore = dashMatch[1].trim();
              // Store number is the trailing digits
              var storeMatch = nameAndStore.match(/^(.+?)\\s+(\\d{3,})\\s*$/);
              if (storeMatch) {
                customerName = storeMatch[1].trim();
                storeNumber = storeMatch[2].trim();
              } else {
                customerName = nameAndStore;
              }
              break;
            }
          }

          // Match WO number in various formats: SERVICEWO#: 4181959, WO: 123, WO# 456, WO #: 789, Work Order: 123, Work Order#: 456
          var woMatch = allText.match(/(?:SERVICEWO|Work\\s*Order|WO)\\s*#?\\s*:?\\s*([A-Za-z0-9\\-]+)/i);
          if (woMatch) woNumber = woMatch[1].trim();

          // Equipment line: "RIF 2  REACH IN FREEZER  REFR"
          // Unit ID is before the equipment type, equipment type is the middle part
          // Look for a line that has the equipment info (after a blank line, contains multiple segments)
          var equipLine = '';
          for (var j = 0; j < lines.length; j++) {
            // Skip lines that are labels (contain ":" like Make:, Model:, etc.)
            if (lines[j].match(/^(PROBLEM|Make|Model|Serial|Description|Service Area|Year|Service Type|Job Type|Cust PO|NTE|Complete|\\d)/i)) continue;
            if (lines[j].match(/:/)) continue;
            if (lines[j].match(/^[A-Z]{2,}/)) continue;
            // Skip address lines (contain comma with state abbreviation)
            if (lines[j].match(/,\\s*[A-Z]{2},?\\s*\\d{5}/)) continue;
            // Skip the customer line (has " - ")
            if (lines[j].match(/\\s+-\\s+/)) continue;
            // Skip blank lines
            if (!lines[j]) continue;
            // This might be the equipment line - it typically has unit ID + equipment type + service code
            // Pattern: letters/numbers + spaces + equipment description + spaces + short code
            var eqMatch = lines[j].match(/^(.+?)\\s{2,}(.+?)\\s{2,}([A-Z]{2,})\\s*$/);
            if (eqMatch) {
              unitId = eqMatch[1].trim();
              equipmentType = eqMatch[2].trim();
              equipLine = lines[j];
              break;
            }
          }

          // If we didn't find the equipment line with double-space parsing, try another approach
          if (!equipLine) {
            for (var k = 0; k < lines.length; k++) {
              // Look for common equipment keywords on a line
              if (lines[k].match(/(?:REACH IN|WALK.IN|RTU|AHU|CONDENSER|COMPRESSOR|DISPLAY CASE|ICE MACHINE|ROOFTOP|SPLIT SYSTEM|HEAT PUMP|FURNACE|FREEZER|COOLER|EVAPORATOR|AIR HANDLER)/i)) {
                // Skip if it's the PROBLEM line
                if (lines[k].match(/^PROBLEM/i)) continue;
                var parts = lines[k].split(/\\s{2,}/);
                if (parts.length >= 2) {
                  unitId = parts[0].trim();
                  equipmentType = parts[1].trim();
                } else {
                  equipmentType = lines[k].trim();
                }
                break;
              }
            }
          }

          // Make / Manufacturer
          var makeMatch = allText.match(/Make\\s*:\\s*(.+)/im);
          if (makeMatch) manufacturer = makeMatch[1].trim();

          // Model
          var modelMatch = allText.match(/Model\\s*#?\\s*:\\s*(.+)/im);
          if (modelMatch) modelNumber = modelMatch[1].trim();

          // Serial #
          var serialMatch = allText.match(/Serial\\s*#?\\s*:\\s*(.+)/im);
          if (serialMatch) serialNumber = serialMatch[1].trim();

          // Set the values
          function setField(id, value) {
            if (value) {
              var el = document.getElementById(id);
              if (el) { el.value = value; }
            }
          }

          setField('customerName', customerName);
          setField('storeNumber', storeNumber);
          setField('woNumber', woNumber);
          setField('equipmentType', equipmentType);
          setField('unit', unitId);
          setField('manufacturer', manufacturer);
          setField('modelNumber', modelNumber);
          setField('serialNumber', serialNumber);

          saveForm();
        }

        window.initQuoteForm = function() {
          fieldIds.forEach(id => { const el=document.getElementById(id); if(el){el.addEventListener('input',saveForm);el.addEventListener('change',saveForm);} });
          radioNames.forEach(name => document.querySelectorAll('input[name="'+name+'"]').forEach(r => r.addEventListener('change', saveForm)));

          document.getElementById('addPartBtn').addEventListener('click', addPartRow);
          document.getElementById('partPrev').addEventListener('click', () => navigatePart(-1));
          document.getElementById('partNext').addEventListener('click', () => navigatePart(1));
          document.getElementById('savePhotoBtn').addEventListener('click', saveAsPhoto);
          document.getElementById('resetBtn').addEventListener('click', resetForm);
          document.getElementById('generateBtn').addEventListener('click', generateFromJobInfo);

          restoreForm();
        };

        if (document.readyState === 'complete') {
          window.initQuoteForm();
        } else {
          window.addEventListener('load', window.initQuoteForm);
        }
      `}</Script>
    </>
  );
}
