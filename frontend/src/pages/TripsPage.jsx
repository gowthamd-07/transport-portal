import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FileSpreadsheet, FileText, Search, Edit2, CheckCircle, XCircle,
  RotateCcw, Truck, Plus, RefreshCw, Eye, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Package, IndianRupee, MapPin, ChevronDown, Trash2
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const COLUMNS = [
  { key: 'order_id', label: 'Order ID', sortable: true },
  { key: 'trip_date', label: 'Date', sortable: true },
  { key: 'from_location', label: 'From', sortable: true },
  { key: 'to_location', label: 'To', sortable: true },
  { key: 'vehicle_type', label: 'Vehicle Type', sortable: true },
  { key: 'vendor', label: 'Vendor', sortable: true },
  { key: 'distance_km', label: 'KM', sortable: true },
  { key: 'trip_amount', label: 'Amount', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

function statusClass(s) {
  if (s === 'Not Closed') return 'not-closed';
  if (s === 'Closed') return 'closed';
  if (s === 'Cancelled') return 'cancelled';
  return '';
}

export default function TripsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 25, total: 0, total_pages: 1 });
  const [summary, setSummary] = useState({ total_trips: 0, total_amount: 0, total_km: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'All', from_date: '', to_date: '', search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState({ sort_by: 'created_at', sort_dir: 'desc' });
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const debounceRef = useRef(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage, ...sort };
      if (filters.status !== 'All') params.status = filters.status;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.search) params.search = filters.search;
      const result = await api.getTrips(params);
      setTrips(result.data);
      setPagination(result.pagination);
      if (result.summary) setSummary(result.summary);
    } catch { toast.error('Failed to load trips'); }
    finally { setLoading(false); }
  }, [filters, sort, page, perPage]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { setPage(1); }, [filters, sort, perPage]);

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  const handleSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleFilterChange('search', value);
    }, 350);
  };

  const handleSort = (key) => {
    setSort(prev => ({
      sort_by: key,
      sort_dir: prev.sort_by === key && prev.sort_dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDelete = (trip) => {
    setConfirmModal({
      title: 'Delete Trip',
      message: `Permanently delete trip ${trip.order_id}? This cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.deleteTrip(trip.id);
          toast.success(`Trip ${trip.order_id} deleted`);
          fetchTrips();
        } catch (err) { toast.error(err.message); }
        setConfirmModal(null);
      },
    });
  };

  const handleStatusChange = (trip, newStatus) => {
    const action = newStatus === 'Cancelled' ? 'cancel' : newStatus === 'Closed' ? 'close' : 'reopen';
    setConfirmModal({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Trip`,
      message: `Are you sure you want to ${action} trip ${trip.order_id}?`,
      variant: newStatus === 'Cancelled' ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          await api.updateTripStatus(trip.id, newStatus);
          toast.success(`Trip ${action}${action.endsWith('e') ? 'd' : 'ed'} successfully`);
          fetchTrips();
        } catch (err) { toast.error(err.message); }
        setConfirmModal(null);
      },
    });
  };

  const downloadParams = {};
  if (filters.status !== 'All') downloadParams.status = filters.status;
  if (filters.from_date) downloadParams.from_date = filters.from_date;
  if (filters.to_date) downloadParams.to_date = filters.to_date;
  if (filters.search) downloadParams.search = filters.search;

  const SortIcon = ({ col }) => {
    if (sort.sort_by !== col) return null;
    return sort.sort_dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="page trips-page">
      <div className="page-header">
        <div>
          <h1>All Trips</h1>
          <p className="page-subtitle">
            {pagination.total} total trips &mdash; Page {pagination.page} of {pagination.total_pages}
          </p>
        </div>
        <div className="trips-actions">
          <a href={api.getDownloadUrl('excel', downloadParams)} className="btn btn-success btn-sm" download>
            <FileSpreadsheet size={14} /> <span className="btn-label">Excel</span>
          </a>
          <a href={api.getDownloadUrl('pdf', downloadParams)} className="btn btn-danger btn-sm" download>
            <FileText size={14} /> <span className="btn-label">PDF</span>
          </a>
          <button className="btn btn-outline btn-sm" onClick={fetchTrips}><RefreshCw size={14} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-trip')}><Plus size={14} /> <span className="btn-label">New</span></button>
        </div>
      </div>

      <div className="trips-summary-bar">
        <div className="trips-summary-item">
          <div className="summary-icon blue"><Package size={18} /></div>
          <div>
            <span className="trips-summary-value">{summary.total_trips}</span>
            <span className="trips-summary-label">Total Trips</span>
          </div>
        </div>
        <div className="trips-summary-item">
          <div className="summary-icon amber"><MapPin size={18} /></div>
          <div>
            <span className="trips-summary-value">{(summary.total_km || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} KM</span>
            <span className="trips-summary-label">Total Distance (Closed)</span>
          </div>
        </div>
        <div className="trips-summary-item highlight">
          <div className="summary-icon white"><IndianRupee size={18} /></div>
          <div>
            <span className="trips-summary-value">₹{(summary.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="trips-summary-label">Total Cost (Closed)</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Search</label>
            <div className="filter-search-wrap">
              <Search size={14} className="filter-search-icon" />
              <input type="text" placeholder="Order ID, location, vendor..." value={searchInput}
                onChange={e => handleSearchChange(e.target.value)} className="filter-search-input" />
            </div>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
              <option>All</option>
              <option>Not Closed</option>
              <option>Closed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>From Date</label>
            <input type="date" value={filters.from_date} onChange={e => handleFilterChange('from_date', e.target.value)} />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input type="date" value={filters.to_date} onChange={e => handleFilterChange('to_date', e.target.value)} />
          </div>
          <div className="filter-group" style={{ maxWidth: 100 }}>
            <label>Per Page</label>
            <select value={perPage} onChange={e => setPerPage(Number(e.target.value))}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Desktop table view */}
        <div className="table-wrapper trips-table-desktop">
          <table>
            <thead>
              <tr>
                <th>#</th>
                {COLUMNS.map(col => (
                  <th key={col.key}
                    className={col.sortable ? 'sortable-th' : ''}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}>
                    <span className="th-content">{col.label} <SortIcon col={col.key} /></span>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="skeleton-row">
                    {Array.from({ length: COLUMNS.length + 2 }).map((__, j) => (
                      <td key={j}><span className="skeleton-cell" /></td>
                    ))}
                  </tr>
                ))
              ) : trips.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + 2}><div className="empty-state"><Truck size={48} /><p>No trips found.</p></div></td></tr>
              ) : trips.map((trip, idx) => (
                <Fragment key={trip.id}>
                  <tr className={statusClass(trip.status)}>
                    <td>{(pagination.page - 1) * pagination.per_page + idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{trip.order_id}</td>
                    <td>{trip.trip_date}</td>
                    <td className="cell-wrap">{trip.from_location}</td>
                    <td className="cell-wrap">{trip.to_location}</td>
                    <td>{trip.vehicle_type}</td>
                    <td className="cell-wrap">{trip.vendor}</td>
                    <td>{trip.distance_km}</td>
                    <td className="amount">₹{(trip.trip_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`status-badge ${statusClass(trip.status)}`}>
                        <span className="status-dot" />{trip.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-outline btn-sm btn-icon" title="Details"
                          onClick={() => setExpandedId(expandedId === trip.id ? null : trip.id)}>
                          <Eye size={14} />
                        </button>
                        {trip.status === 'Not Closed' && (
                          <>
                            <button className="btn btn-outline btn-sm btn-icon" title="Edit" onClick={() => navigate(`/edit-trip/${trip.id}`)}><Edit2 size={14} /></button>
                            <button className="btn btn-success btn-sm btn-icon" title="Close Trip" onClick={() => handleStatusChange(trip, 'Closed')}><CheckCircle size={14} /></button>
                            <button className="btn btn-danger btn-sm btn-icon" title="Cancel Trip" onClick={() => handleStatusChange(trip, 'Cancelled')}><XCircle size={14} /></button>
                          </>
                        )}
                        {trip.status === 'Closed' && (
                          <button className="btn btn-outline btn-sm btn-icon" title="Reopen" onClick={() => handleStatusChange(trip, 'Not Closed')}><RotateCcw size={14} /></button>
                        )}
                        {isAdmin && (
                          <button className="btn btn-danger btn-sm btn-icon" title="Delete Trip" onClick={() => handleDelete(trip)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === trip.id && (
                    <tr className="detail-row">
                      <td colSpan={COLUMNS.length + 2}>
                        <div className="detail-grid">
                          <Detail label="Branch" value={trip.branch} />
                          <Detail label="Trip Base" value={trip.trip_base} />
                          <Detail label="Trip Type" value={trip.trip_type} />
                          <Detail label="Vehicle No" value={trip.vehicle_no} />
                          <Detail label="Driver" value={trip.driver_name} />
                          <Detail label="Mobile" value={trip.mobile_no} />
                          <Detail label="Rate/KM" value={trip.rate_per_km ? `₹${trip.rate_per_km}` : '-'} />
                          <Detail label="Packages" value={trip.total_packages} />
                          <Detail label="Weight" value={trip.weight} />
                          <Detail label="Pickup Plant" value={trip.pickup_plant} />
                          <Detail label="Delivery Plant" value={trip.delivery_plant} />
                          <Detail label="Remarks" value={trip.remarks} />
                          <Detail label="Created By" value={trip.created_by_name} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="trips-cards-mobile">
          {loading ? (
            <div className="empty-cell">Loading...</div>
          ) : trips.length === 0 ? (
            <div className="empty-state"><Truck size={48} /><p>No trips found.</p></div>
          ) : trips.map((trip, idx) => (
            <div key={trip.id} className={`trip-card ${statusClass(trip.status)}`}>
              <div className="trip-card-header" onClick={() => setExpandedId(expandedId === trip.id ? null : trip.id)}>
                <div className="trip-card-top">
                  <span className="trip-card-id">{trip.order_id}</span>
                  <span className={`status-badge ${statusClass(trip.status)}`}>
                    <span className="status-dot" />{trip.status}
                  </span>
                </div>
                <div className="trip-card-route">
                  <span>{trip.from_location}</span>
                  <span className="trip-card-arrow">→</span>
                  <span>{trip.to_location}</span>
                </div>
                <div className="trip-card-meta">
                  <span>{trip.trip_date}</span>
                  <span>{trip.vehicle_type}</span>
                  <span className="amount">₹{(trip.trip_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <ChevronDown size={16} className={`trip-card-chevron ${expandedId === trip.id ? 'open' : ''}`} />
              </div>

              {expandedId === trip.id && (
                <div className="trip-card-body">
                  <div className="trip-card-details">
                    <Detail label="Vendor" value={trip.vendor} />
                    <Detail label="Branch" value={trip.branch} />
                    <Detail label="Trip Base" value={trip.trip_base} />
                    <Detail label="Trip Type" value={trip.trip_type} />
                    <Detail label="Vehicle No" value={trip.vehicle_no} />
                    <Detail label="Driver" value={trip.driver_name} />
                    <Detail label="Mobile" value={trip.mobile_no} />
                    <Detail label="KM" value={trip.distance_km} />
                    <Detail label="Rate/KM" value={trip.rate_per_km ? `₹${trip.rate_per_km}` : '-'} />
                    <Detail label="Packages" value={trip.total_packages} />
                    <Detail label="Weight" value={trip.weight} />
                    <Detail label="Pickup Plant" value={trip.pickup_plant} />
                    <Detail label="Delivery Plant" value={trip.delivery_plant} />
                    <Detail label="Remarks" value={trip.remarks} />
                    <Detail label="Created By" value={trip.created_by_name} />
                  </div>
                  <div className="trip-card-actions">
                    {trip.status === 'Not Closed' && (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/edit-trip/${trip.id}`)}><Edit2 size={13} /> Edit</button>
                        <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(trip, 'Closed')}><CheckCircle size={13} /> Close</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(trip, 'Cancelled')}><XCircle size={13} /> Cancel</button>
                      </>
                    )}
                    {trip.status === 'Closed' && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange(trip, 'Not Closed')}><RotateCcw size={13} /> Reopen</button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(trip)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {pagination.total_pages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing {(pagination.page - 1) * pagination.per_page + 1}&ndash;{Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}
            </span>
            <div className="pagination-btns">
              <button disabled={page <= 1} onClick={() => setPage(1)} title="First"><ChevronsLeft size={16} /></button>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} title="Previous"><ChevronLeft size={16} /></button>
              {generatePageNumbers(pagination.page, pagination.total_pages).map((p, i) =>
                p === '...' ? <span key={`e${i}`} className="page-ellipsis">...</span> :
                <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              )}
              <button disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)} title="Next"><ChevronRight size={16} /></button>
              <button disabled={page >= pagination.total_pages} onClick={() => setPage(pagination.total_pages)} title="Last"><ChevronsRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
    </div>
  );
}

function generatePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '-'}</span>
    </div>
  );
}
