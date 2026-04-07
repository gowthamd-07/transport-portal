import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Database, Truck, UserCheck, MapPin, Route, Building2, ChevronDown, Search, Shield } from 'lucide-react';
import { api } from '../api';

const SIMPLE_TABS = [
  { key: 'tripBases', label: 'Trip Base', icon: <Route size={15} />, fetch: api.getTripBases, add: api.addTripBase, del: api.deleteTripBase },
  { key: 'tripTypes', label: 'Trip Type', icon: <Route size={15} />, fetch: api.getTripTypes, add: api.addTripType, del: api.deleteTripType },
  { key: 'locations', label: 'From / To', icon: <MapPin size={15} />, fetch: api.getLocations, add: api.addLocation, del: api.deleteLocation },
  { key: 'plants', label: 'Plant (CNOR/CNEE)', icon: <Building2 size={15} />, fetch: api.getPlants, add: api.addPlant, del: api.deletePlant },
  { key: 'vehicleTypes', label: 'Vehicle Type', icon: <Truck size={15} />, fetch: api.getVehicleTypes, add: api.addVehicleType, del: api.deleteVehicleType },
  { key: 'vendors', label: 'Vendor', icon: <Building2 size={15} />, fetch: api.getVendors, add: api.addVendor, del: api.deleteVendor },
  { key: 'branches', label: 'Branch', icon: <Building2 size={15} />, fetch: api.getBranches, add: api.addBranch, del: api.deleteBranch },
];

const COMPLEX_TABS = [
  { key: 'vehicles', label: 'Vehicle No / Registration', icon: <Truck size={15} /> },
  { key: 'drivers', label: 'Driver / Mobile', icon: <UserCheck size={15} /> },
];

function ExpiryLabel({ date }) {
  if (!date) return <span className="md-exp-val md-exp-none">Not set</span>;
  const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
  const cls = diff < 0 ? 'expired' : diff <= 15 ? 'critical' : diff <= 30 ? 'warning' : 'ok';
  const badge = diff < 0 ? `${Math.abs(diff)}d overdue` : diff <= 30 ? `${diff}d left` : '';
  return (
    <span className={`md-exp-val md-exp-${cls}`}>
      {date} {badge && <span className="md-exp-badge">{badge}</span>}
    </span>
  );
}

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState('tripBases');
  const [data, setData] = useState({});
  const [newVal, setNewVal] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [vehicleForm, setVehicleForm] = useState({ vehicle_no: '', vehicle_type: '', owner_name: '', fc_expiry: '', pollution_expiry: '', insurance_expiry: '', tax_expiry: '', permit_expiry: '' });
  const [driverForm, setDriverForm] = useState({ name: '', mobile_no: '', license_no: '', vehicle_no: '' });
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadTab = useCallback(async (key) => {
    try {
      const simple = SIMPLE_TABS.find(t => t.key === key);
      if (simple) {
        const items = await simple.fetch();
        setData(prev => ({ ...prev, [key]: items }));
      } else if (key === 'vehicles') {
        const [v, vt] = await Promise.all([api.getVehicles(), api.getVehicleTypes()]);
        setData(prev => ({ ...prev, vehicles: v }));
        setVehicleTypes(vt);
      } else if (key === 'drivers') {
        const [d, v] = await Promise.all([api.getDrivers(), api.getVehicles()]);
        setData(prev => ({ ...prev, drivers: d }));
        setVehicles(v);
      }
    } catch { toast.error('Failed to load data'); }
  }, []);

  useEffect(() => { loadTab(activeTab); setSearchVal(''); setShowAddForm(false); }, [activeTab, loadTab]);

  const handleSimpleAdd = async () => {
    if (!newVal.trim()) return;
    const tab = SIMPLE_TABS.find(t => t.key === activeTab);
    if (!tab) return;
    try {
      await tab.add(newVal.trim());
      toast.success(`${tab.label} added`);
      setNewVal('');
      loadTab(activeTab);
    } catch (err) { toast.error(err.message); }
  };

  const handleSimpleDelete = async (id) => {
    const tab = SIMPLE_TABS.find(t => t.key === activeTab);
    if (!tab) return;
    try {
      await tab.del(id);
      toast.success(`${tab.label} deleted`);
      loadTab(activeTab);
    } catch (err) { toast.error(err.message); }
  };

  const handleVehicleAdd = async () => {
    if (!vehicleForm.vehicle_no || !vehicleForm.vehicle_type) {
      toast.error('Vehicle No and Type are required');
      return;
    }
    try {
      await api.createVehicle(vehicleForm);
      toast.success('Vehicle added');
      setVehicleForm({ vehicle_no: '', vehicle_type: '', owner_name: '', fc_expiry: '', pollution_expiry: '', insurance_expiry: '', tax_expiry: '', permit_expiry: '' });
      setShowAddForm(false);
      loadTab('vehicles');
    } catch (err) { toast.error(err.message); }
  };

  const handleVehicleDelete = async (id) => {
    try {
      await api.deleteVehicle(id);
      toast.success('Vehicle deleted');
      loadTab('vehicles');
    } catch (err) { toast.error(err.message); }
  };

  const handleDriverAdd = async () => {
    if (!driverForm.name || !driverForm.mobile_no) {
      toast.error('Name and Mobile No are required');
      return;
    }
    try {
      await api.createDriver(driverForm);
      toast.success('Driver added');
      setDriverForm({ name: '', mobile_no: '', license_no: '', vehicle_no: '' });
      setShowAddForm(false);
      loadTab('drivers');
    } catch (err) { toast.error(err.message); }
  };

  const handleDriverDelete = async (id) => {
    try {
      await api.deleteDriver(id);
      toast.success('Driver deleted');
      loadTab('drivers');
    } catch (err) { toast.error(err.message); }
  };

  const allTabs = [...SIMPLE_TABS, ...COMPLEX_TABS];
  const isSimple = SIMPLE_TABS.some(t => t.key === activeTab);
  const items = data[activeTab] || [];
  const activeLabel = allTabs.find(t => t.key === activeTab)?.label;

  const filteredItems = searchVal.trim()
    ? items.filter(item => {
        const s = searchVal.toLowerCase();
        return Object.values(item).some(v => typeof v === 'string' && v.toLowerCase().includes(s));
      })
    : items;

  const vf = (field, val) => setVehicleForm(p => ({ ...p, [field]: val }));
  const df = (field, val) => setDriverForm(p => ({ ...p, [field]: val }));

  return (
    <div className="page md-page">
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <Database size={22} className="page-title-icon" />
            <h1>Master Data Management</h1>
          </div>
          <p className="page-subtitle">Manage lookup data used across the application</p>
        </div>
      </div>

      <div className="md-tabs-wrap">
        <div className="md-tabs">
          {allTabs.map(t => {
            const count = (data[t.key] || []).length;
            return (
              <button key={t.key} className={`md-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.icon}
                <span className="md-tab-text">{t.label}</span>
                {count > 0 && <span className="md-tab-count">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card md-card">
        <div className="md-card-header">
          <div className="md-card-title">
            <h2>{activeLabel}</h2>
            <span className="md-card-badge">{items.length} {items.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          <div className="md-card-actions">
            {(activeTab === 'vehicles' || activeTab === 'drivers') && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? 'Cancel' : <><Plus size={14} /> Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}</>}
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {/* ===== SIMPLE TAB: ADD + LIST ===== */}
          {isSimple && (
            <>
              <div className="md-simple-bar">
                <div className="md-add-group">
                  <div className="md-add-input-wrap">
                    <Plus size={16} className="md-add-icon" />
                    <input
                      type="text"
                      className="md-add-input"
                      placeholder={`Add new ${activeLabel}...`}
                      value={newVal}
                      onChange={e => setNewVal(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSimpleAdd()}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleSimpleAdd}>Add</button>
                </div>
                {items.length > 5 && (
                  <div className="md-search-group">
                    <Search size={14} className="md-search-icon" />
                    <input
                      type="text"
                      className="md-search-input"
                      placeholder="Search..."
                      value={searchVal}
                      onChange={e => setSearchVal(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="md-list">
                {filteredItems.length === 0 ? (
                  <div className="md-empty">{searchVal ? 'No matches found' : `No ${activeLabel} entries yet`}</div>
                ) : filteredItems.map((item, idx) => (
                  <div key={item.id} className="md-list-item">
                    <span className="md-list-num">{idx + 1}</span>
                    <span className="md-list-name">{item.name}</span>
                    <button className="md-list-del" title="Delete" onClick={() => handleSimpleDelete(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== VEHICLE TAB ===== */}
          {activeTab === 'vehicles' && (
            <>
              {showAddForm && (
                <div className="md-add-form">
                  <div className="md-add-form-title">New Vehicle</div>
                  <div className="md-form-row">
                    <div className="md-field">
                      <label>Vehicle No <span className="required">*</span></label>
                      <input type="text" placeholder="e.g. TN38AQ7447" value={vehicleForm.vehicle_no} onChange={e => vf('vehicle_no', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>Vehicle Type <span className="required">*</span></label>
                      <select value={vehicleForm.vehicle_type} onChange={e => vf('vehicle_type', e.target.value)}>
                        <option value="">-- Select Type --</option>
                        {vehicleTypes.map(vt => <option key={vt.id} value={vt.name}>{vt.name}</option>)}
                      </select>
                    </div>
                    <div className="md-field">
                      <label>Owner Name</label>
                      <input type="text" placeholder="Owner / Company" value={vehicleForm.owner_name} onChange={e => vf('owner_name', e.target.value)} />
                    </div>
                  </div>
                  <div className="md-form-section-label"><Shield size={13} /> Document Expiry Dates</div>
                  <div className="md-form-row md-form-row-5">
                    <div className="md-field">
                      <label>FC</label>
                      <input type="date" value={vehicleForm.fc_expiry} onChange={e => vf('fc_expiry', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>Pollution</label>
                      <input type="date" value={vehicleForm.pollution_expiry} onChange={e => vf('pollution_expiry', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>Insurance</label>
                      <input type="date" value={vehicleForm.insurance_expiry} onChange={e => vf('insurance_expiry', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>Tax</label>
                      <input type="date" value={vehicleForm.tax_expiry} onChange={e => vf('tax_expiry', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>Permit</label>
                      <input type="date" value={vehicleForm.permit_expiry} onChange={e => vf('permit_expiry', e.target.value)} />
                    </div>
                  </div>
                  <div className="md-form-actions">
                    <button className="btn btn-primary btn-sm" onClick={handleVehicleAdd}><Plus size={14} /> Add Vehicle</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {items.length > 3 && (
                <div className="md-search-bar">
                  <Search size={14} className="md-search-icon" />
                  <input type="text" className="md-search-input" placeholder="Search vehicles..." value={searchVal} onChange={e => setSearchVal(e.target.value)} />
                </div>
              )}

              {/* Desktop table */}
              <div className="table-wrapper vehicle-table-desktop">
                <table className="md-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th>Vehicle No</th>
                      <th>Type</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>FC</th>
                      <th>Pollution</th>
                      <th>Insurance</th>
                      <th>Tax</th>
                      <th>Permit</th>
                      <th style={{ width: 56 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr><td colSpan={11} className="empty-cell">{searchVal ? 'No matches' : 'No vehicles yet'}</td></tr>
                    ) : filteredItems.map((v, idx) => (
                      <tr key={v.id}>
                        <td className="md-td-num">{idx + 1}</td>
                        <td className="md-td-primary">{v.vehicle_no}</td>
                        <td>{v.vehicle_type}</td>
                        <td>{v.owner_name || <span className="md-muted">-</span>}</td>
                        <td>
                          <span className={`status-badge ${v.status === 'Available' ? 'closed' : v.status === 'On Trip' ? 'not-closed' : 'cancelled'}`}>
                            <span className="status-dot" />{v.status}
                          </span>
                        </td>
                        <td><ExpiryLabel date={v.fc_expiry} /></td>
                        <td><ExpiryLabel date={v.pollution_expiry} /></td>
                        <td><ExpiryLabel date={v.insurance_expiry} /></td>
                        <td><ExpiryLabel date={v.tax_expiry} /></td>
                        <td><ExpiryLabel date={v.permit_expiry} /></td>
                        <td>
                          <button className="md-list-del" title="Delete" onClick={() => handleVehicleDelete(v.id)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="vehicle-cards-mobile">
                {filteredItems.length === 0 ? (
                  <div className="md-empty">{searchVal ? 'No matches' : 'No vehicles yet'}</div>
                ) : filteredItems.map((v) => (
                  <div key={v.id} className="vcard">
                    <div className="vcard-header" onClick={() => setExpandedId(expandedId === `v${v.id}` ? null : `v${v.id}`)}>
                      <div className="vcard-top">
                        <span className="vcard-no">{v.vehicle_no}</span>
                        <span className={`status-badge ${v.status === 'Available' ? 'closed' : v.status === 'On Trip' ? 'not-closed' : 'cancelled'}`}>
                          <span className="status-dot" />{v.status}
                        </span>
                      </div>
                      <div className="vcard-sub">{v.vehicle_type} {v.owner_name ? `· ${v.owner_name}` : ''}</div>
                      <ChevronDown size={16} className={`vcard-chevron ${expandedId === `v${v.id}` ? 'open' : ''}`} />
                    </div>
                    {expandedId === `v${v.id}` && (
                      <div className="vcard-body">
                        <div className="vcard-exp-grid">
                          <div className="vcard-exp-item"><span className="vcard-exp-label">FC</span><ExpiryLabel date={v.fc_expiry} /></div>
                          <div className="vcard-exp-item"><span className="vcard-exp-label">Pollution</span><ExpiryLabel date={v.pollution_expiry} /></div>
                          <div className="vcard-exp-item"><span className="vcard-exp-label">Insurance</span><ExpiryLabel date={v.insurance_expiry} /></div>
                          <div className="vcard-exp-item"><span className="vcard-exp-label">Tax</span><ExpiryLabel date={v.tax_expiry} /></div>
                          <div className="vcard-exp-item"><span className="vcard-exp-label">Permit</span><ExpiryLabel date={v.permit_expiry} /></div>
                        </div>
                        <button className="btn btn-danger btn-sm vcard-del" onClick={() => handleVehicleDelete(v.id)}><Trash2 size={13} /> Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== DRIVER TAB ===== */}
          {activeTab === 'drivers' && (
            <>
              {showAddForm && (
                <div className="md-add-form">
                  <div className="md-add-form-title">New Driver</div>
                  <div className="md-form-row">
                    <div className="md-field">
                      <label>Driver Name <span className="required">*</span></label>
                      <input type="text" placeholder="Full name" value={driverForm.name} onChange={e => df('name', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>Mobile No <span className="required">*</span></label>
                      <input type="tel" placeholder="e.g. 9952591009" value={driverForm.mobile_no} onChange={e => df('mobile_no', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>License No</label>
                      <input type="text" placeholder="DL number" value={driverForm.license_no} onChange={e => df('license_no', e.target.value)} />
                    </div>
                    <div className="md-field">
                      <label>Linked Vehicle</label>
                      <select value={driverForm.vehicle_no} onChange={e => df('vehicle_no', e.target.value)}>
                        <option value="">-- Select Vehicle --</option>
                        {vehicles.map(v => <option key={v.id} value={v.vehicle_no}>{v.vehicle_no} ({v.vehicle_type})</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="md-form-actions">
                    <button className="btn btn-primary btn-sm" onClick={handleDriverAdd}><Plus size={14} /> Add Driver</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {items.length > 3 && (
                <div className="md-search-bar">
                  <Search size={14} className="md-search-icon" />
                  <input type="text" className="md-search-input" placeholder="Search drivers..." value={searchVal} onChange={e => setSearchVal(e.target.value)} />
                </div>
              )}

              {/* Desktop table */}
              <div className="table-wrapper driver-table-desktop">
                <table className="md-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th>Name</th>
                      <th>Mobile</th>
                      <th>License</th>
                      <th>Vehicle</th>
                      <th>Status</th>
                      <th style={{ width: 56 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr><td colSpan={7} className="empty-cell">{searchVal ? 'No matches' : 'No drivers yet'}</td></tr>
                    ) : filteredItems.map((d, idx) => (
                      <tr key={d.id}>
                        <td className="md-td-num">{idx + 1}</td>
                        <td className="md-td-primary">{d.name}</td>
                        <td>{d.mobile_no}</td>
                        <td>{d.license_no || <span className="md-muted">-</span>}</td>
                        <td>{d.vehicle_no || <span className="md-muted">-</span>}</td>
                        <td>
                          <span className={`status-badge ${d.status === 'Available' ? 'closed' : d.status === 'On Trip' ? 'not-closed' : 'cancelled'}`}>
                            <span className="status-dot" />{d.status}
                          </span>
                        </td>
                        <td>
                          <button className="md-list-del" title="Delete" onClick={() => handleDriverDelete(d.id)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="driver-cards-mobile">
                {filteredItems.length === 0 ? (
                  <div className="md-empty">{searchVal ? 'No matches' : 'No drivers yet'}</div>
                ) : filteredItems.map((d) => (
                  <div key={d.id} className="vcard">
                    <div className="vcard-header">
                      <div className="vcard-top">
                        <span className="vcard-no">{d.name}</span>
                        <span className={`status-badge ${d.status === 'Available' ? 'closed' : d.status === 'On Trip' ? 'not-closed' : 'cancelled'}`}>
                          <span className="status-dot" />{d.status}
                        </span>
                      </div>
                      <div className="vcard-sub">{d.mobile_no} {d.license_no ? `· ${d.license_no}` : ''} {d.vehicle_no ? `· ${d.vehicle_no}` : ''}</div>
                    </div>
                    <div className="vcard-footer">
                      <span className="md-muted" style={{ fontSize: 11 }}>{d.license_no || 'No license'}</span>
                      <button className="md-list-del" title="Delete" onClick={() => handleDriverDelete(d.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
