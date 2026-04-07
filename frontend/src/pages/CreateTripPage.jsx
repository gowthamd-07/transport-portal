import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, PlusCircle, Calculator, Truck, Package, MapPin, X, ChevronDown } from 'lucide-react';
import { api } from '../api';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const initial = {
  order_id: '',
  trip_date: todayISO(),
  branch: '',
  from_location: '', to_location: '',
  trip_type: '', trip_base: '',
  vehicle_type: '', vendor: '',
  vehicle_no: '', vehicle_reg: '', driver_name: '', mobile_no: '',
  weight: '', total_packages: '',
  pickup_plant: '', delivery_plant: '',
  distance_km: '', rate_per_km: '', trip_amount: '',
  is_manual_amount: false,
  remarks: '',
};

function InlineAddField({ label, placeholder, onAdd, onCancel }) {
  const [val, setVal] = useState('');
  return (
    <div className="inline-add-row">
      <input type="text" placeholder={placeholder || `New ${label}`} value={val} onChange={e => setVal(e.target.value)} />
      <button type="button" className="btn btn-primary btn-sm" onClick={() => { if (val.trim()) onAdd(val.trim()); }}>Add</button>
      <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}

function SearchableSelect({ label, required, value, onChange, options, nameKey = 'name', displayFn, placeholder, onAdd, addLabel }) {
  const [showAdd, setShowAdd] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getDisplay = (o) => displayFn ? displayFn(o) : o[nameKey];
  const filtered = options.filter(o => getDisplay(o).toLowerCase().includes(query.toLowerCase()));
  const selectedLabel = value ? (options.find(o => o[nameKey] === value || (displayFn && getDisplay(o) === value)) || null) : null;

  const handleAdd = async (name) => {
    try {
      await onAdd(name);
      toast.success(`${label} added`);
      setShowAdd(false);
    } catch (err) { toast.error(err.message); }
  };

  const handleSelect = (o) => {
    onChange(o[nameKey], o);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setQuery('');
  };

  return (
    <div className="form-group">
      <label>
        {label} {required && <span className="required">*</span>}
        {onAdd && (
          <button type="button" className="inline-add-btn" onClick={() => setShowAdd(!showAdd)}>
            <PlusCircle size={13} /> Add
          </button>
        )}
      </label>
      {showAdd ? (
        <InlineAddField label={addLabel || label} onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      ) : (
        <div className={`ss-wrapper${open ? ' ss-active' : ''}`} ref={wrapperRef}>
          <div className={`ss-control ${open ? 'ss-open' : ''}`} onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
            {open ? (
              <input
                ref={inputRef}
                className="ss-input"
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholder || `Search ${label}...`}
                onKeyDown={e => {
                  if (e.key === 'Escape') setOpen(false);
                  if (e.key === 'Enter' && filtered.length === 1) { e.preventDefault(); handleSelect(filtered[0]); }
                }}
              />
            ) : (
              <span className={`ss-value ${value ? '' : 'ss-placeholder'}`}>
                {selectedLabel ? getDisplay(selectedLabel) : (placeholder || `Select ${label}`)}
              </span>
            )}
            <div className="ss-indicators">
              {value && <button type="button" className="ss-clear" onClick={handleClear}><X size={14} /></button>}
              <ChevronDown size={14} className={`ss-chevron ${open ? 'ss-chevron-open' : ''}`} />
            </div>
          </div>
          {open && (
            <div className="ss-menu">
              {filtered.length === 0 ? (
                <div className="ss-empty">No results for &ldquo;{query}&rdquo;</div>
              ) : filtered.map(o => (
                <div
                  key={o.id}
                  className={`ss-option ${o[nameKey] === value ? 'ss-selected' : ''}`}
                  onMouseDown={e => { e.preventDefault(); handleSelect(o); }}
                >
                  {getDisplay(o)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateTripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [masters, setMasters] = useState({
    vehicleTypes: [], vendors: [], plants: [], locations: [],
    branches: [], tripBases: [], tripTypes: [],
    vehicles: [], drivers: [],
  });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(id);

  useEffect(() => {
    Promise.all([
      api.getVehicleTypes(), api.getVendors(), api.getPlants(),
      api.getBranches(), api.getTripBases(), api.getTripTypes(),
      api.getVehicles(), api.getDrivers(), api.getLocations(),
    ]).then(([vehicleTypes, vendors, plants, branches, tripBases, tripTypes, vehicles, drivers, locations]) => {
      setMasters({ vehicleTypes, vendors, plants, branches, tripBases, tripTypes, vehicles, drivers, locations });
    });
  }, []);

  const refreshMaster = async (key, fetcher) => {
    const data = await fetcher();
    setMasters(prev => ({ ...prev, [key]: data }));
  };

  useEffect(() => {
    if (id) {
      api.getTrip(id).then(trip => {
        const f = {};
        Object.keys(initial).forEach(k => {
          if (k === 'is_manual_amount') f[k] = !!trip[k];
          else f[k] = trip[k] !== null && trip[k] !== undefined ? String(trip[k]) : '';
        });
        if (!f.trip_date) f.trip_date = initial.trip_date;
        setForm(f);
      }).catch(() => toast.error('Trip not found'));
    }
  }, [id]);

  const computedAmount = !form.is_manual_amount
    ? ((parseFloat(form.distance_km) || 0) * (parseFloat(form.rate_per_km) || 0)).toFixed(2)
    : form.trip_amount;

  const ch = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.from_location || !form.to_location || !form.vehicle_type || !form.vendor) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, trip_amount: form.is_manual_amount ? form.trip_amount : computedAmount };
      if (isEdit) {
        await api.updateTrip(id, payload);
        toast.success('Trip updated successfully');
      } else {
        await api.createTrip(payload);
        toast.success('Trip created successfully');
      }
      navigate('/trips');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Trip' : 'Create Vehicle Plan'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update trip details below' : 'Fill in the vehicle route planning details. Order ID is auto-generated.'}</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h2><Package size={16} /> Order Information</h2>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Order ID</label>
                <input type="text" value={isEdit ? form.order_id || `#${id}` : 'Auto Generated'} disabled />
              </div>
              <div className="form-group">
                <label>Date <span className="required">*</span></label>
                <input type="date" value={form.trip_date} onChange={e => ch('trip_date', e.target.value)} disabled={isEdit} />
              </div>
              <SearchableSelect label="Branch" value={form.branch} onChange={v => ch('branch', v)}
                options={masters.branches} onAdd={async n => { await api.addBranch(n); refreshMaster('branches', api.getBranches); }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2><MapPin size={16} /> Trip Details</h2>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <SearchableSelect label="Trip Base" value={form.trip_base} onChange={v => ch('trip_base', v)}
                options={masters.tripBases}
                onAdd={async n => { await api.addTripBase(n); refreshMaster('tripBases', api.getTripBases); }} />
              <SearchableSelect label="Trip Type" value={form.trip_type} onChange={v => ch('trip_type', v)}
                options={masters.tripTypes}
                onAdd={async n => { await api.addTripType(n); refreshMaster('tripTypes', api.getTripTypes); }} />
              <SearchableSelect label="From (Pickup)" required value={form.from_location} onChange={v => ch('from_location', v)}
                options={masters.locations}
                onAdd={async n => { await api.addLocation(n); refreshMaster('locations', api.getLocations); }} />
              <SearchableSelect label="To (Delivery)" required value={form.to_location} onChange={v => ch('to_location', v)}
                options={masters.locations}
                onAdd={async n => { await api.addLocation(n); refreshMaster('locations', api.getLocations); }} />
              <SearchableSelect label="Pickup Plant (CNOR)" value={form.pickup_plant} onChange={v => ch('pickup_plant', v)}
                options={masters.plants} />
              <SearchableSelect label="Delivery Plant (CNEE)" value={form.delivery_plant} onChange={v => ch('delivery_plant', v)}
                options={masters.plants} />
              <div className="form-group full-width">
                <label>Remarks</label>
                <textarea rows={2} placeholder="e.g. Kalapati WH collection urgent" value={form.remarks} onChange={e => ch('remarks', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2><Truck size={16} /> Vehicle & Vendor</h2>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <SearchableSelect label="Vehicle Type" required value={form.vehicle_type} onChange={v => ch('vehicle_type', v)}
                options={masters.vehicleTypes}
                onAdd={async n => { await api.addVehicleType(n); refreshMaster('vehicleTypes', api.getVehicleTypes); }} />
              <SearchableSelect label="Vendor" required value={form.vendor} onChange={v => ch('vendor', v)}
                options={masters.vendors}
                onAdd={async n => { await api.addVendor(n); refreshMaster('vendors', api.getVendors); }} />
              <SearchableSelect label="Vehicle No" value={form.vehicle_no}
                nameKey="vehicle_no"
                displayFn={v => `${v.vehicle_no} (${v.vehicle_type})${v.status !== 'Available' ? ` [${v.status}]` : ''}`}
                options={masters.vehicles.filter(v => v.status === 'Available' || v.vehicle_no === form.vehicle_no)}
                onChange={(vno, vObj) => {
                  ch('vehicle_no', vno);
                  if (vObj) { ch('vehicle_reg', vObj.vehicle_reg || ''); ch('vehicle_type', vObj.vehicle_type); }
                  const drv = masters.drivers.find(d => d.vehicle_no === vno);
                  if (drv) { ch('driver_name', drv.name); ch('mobile_no', drv.mobile_no); }
                }}
              />
              <div className="form-group">
                <label>Vehicle Registration</label>
                <input type="text" placeholder="e.g. TN38AQ7447" value={form.vehicle_reg} onChange={e => ch('vehicle_reg', e.target.value)} />
              </div>
              <SearchableSelect label="Driver" value={form.driver_name}
                nameKey="name"
                displayFn={d => `${d.name} (${d.mobile_no})${d.status !== 'Available' ? ` [${d.status}]` : ''}`}
                options={masters.drivers.filter(d => d.status === 'Available' || d.name === form.driver_name)}
                onChange={(dname, dObj) => {
                  ch('driver_name', dname);
                  if (dObj) { ch('mobile_no', dObj.mobile_no); if (dObj.vehicle_no && !form.vehicle_no) ch('vehicle_no', dObj.vehicle_no); }
                }}
              />
              <div className="form-group">
                <label>Mobile No</label>
                <input type="tel" placeholder="e.g. 9952591009" value={form.mobile_no} onChange={e => ch('mobile_no', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2><Calculator size={16} /> Consignment & Cost</h2>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Weight (Kg)</label>
                <input type="number" step="0.1" min="0" placeholder="0" value={form.weight} onChange={e => ch('weight', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Total Packages</label>
                <input type="number" min="0" placeholder="0" value={form.total_packages} onChange={e => ch('total_packages', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Distance (KM)</label>
                <input type="number" step="0.1" min="0" placeholder="0" value={form.distance_km} onChange={e => ch('distance_km', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Rate per KM (₹)</label>
                <input type="number" step="0.5" min="0" placeholder="0" value={form.rate_per_km} onChange={e => ch('rate_per_km', e.target.value)} disabled={form.is_manual_amount} />
              </div>
              <div className="form-group">
                <label>Trip Amount (₹)</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0"
                  className={form.is_manual_amount ? '' : 'computed'}
                  value={form.is_manual_amount ? form.trip_amount : computedAmount}
                  onChange={e => ch('trip_amount', e.target.value)}
                  disabled={!form.is_manual_amount}
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label" style={{ marginTop: 24 }}>
                  <input type="checkbox" checked={form.is_manual_amount} onChange={e => ch('is_manual_amount', e.target.checked)} />
                  Manual Amount Entry
                </label>
              </div>
            </div>
            <div className="final-amount-bar">
              <span className="final-amount-label">Final Trip Amount</span>
              <span className="final-amount-value">
                ₹{parseFloat(form.is_manual_amount ? form.trip_amount : computedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {!form.is_manual_amount && parseFloat(form.distance_km) > 0 && (
                <span className="final-amount-calc">
                  ({form.distance_km} KM × ₹{form.rate_per_km}/KM)
                </span>
              )}
              {form.is_manual_amount && <span className="final-amount-calc">(Manual Entry)</span>}
            </div>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 0, marginBottom: 32 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : isEdit ? 'Update Trip' : 'Create Vehicle Plan'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => { setForm(initial); toast.success('Form cleared'); }}>
            Clear
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
