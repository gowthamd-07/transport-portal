import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Package, CheckCircle, XCircle, IndianRupee, TrendingUp, Plus,
  Clock, CalendarDays, BarChart3, Building2, AlertTriangle, ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function expiryStatusClass(status) {
  if (status === 'Expired') return 'expired';
  if (status === 'Critical') return 'critical';
  if (status === 'Warning') return 'warning';
  return 'upcoming';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0, notClosed: 0, closed: 0, cancelled: 0, totalRevenue: 0,
    todayTrips: 0, todayRevenue: 0, vendorWise: [], monthlySummary: [],
  });
  const [recentTrips, setRecentTrips] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [expandedRecent, setExpandedRecent] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [s, t, exp] = await Promise.all([
        api.getStats(),
        api.getTrips({ per_page: 8, page: 1 }),
        api.getExpiryAlerts(),
      ]);
      setStats(s);
      setRecentTrips(t.data || []);
      setExpiryAlerts(exp || []);
    } catch {
      toast.error('Failed to load dashboard');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const cards = [
    { label: 'Trips Today',    value: stats.todayTrips,                                                              icon: <CalendarDays size={20} />, cls: 'blue' },
    { label: 'Today Revenue',  value: `₹${(stats.todayRevenue  || 0).toLocaleString('en-IN')}`,                     icon: <IndianRupee  size={20} />, cls: 'green' },
    { label: 'Total Trips',    value: stats.total,                                                                   icon: <Package      size={20} />, cls: 'blue' },
    { label: 'Not Closed',     value: stats.notClosed,                                                              icon: <Clock        size={20} />, cls: 'amber' },
    { label: 'Closed Trips',   value: stats.closed,                                                                 icon: <CheckCircle  size={20} />, cls: 'green' },
    { label: 'Cancelled',      value: stats.cancelled,                                                              icon: <XCircle      size={20} />, cls: 'red' },
    { label: 'Total Revenue',  value: `₹${(stats.totalRevenue  || 0).toLocaleString('en-IN')}`,                     icon: <IndianRupee  size={20} />, cls: 'blue' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.full_name} &mdash; {today}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/create-trip')}>
          <Plus size={16} /> New Trip
        </button>
      </div>

      <div className="stats-grid dash-stats-grid">
        {cards.map(c => (
          <div className="stat-card" key={c.label}>
            <div className={`stat-icon ${c.cls}`}>{c.icon}</div>
            <div className="stat-info">
              <h3>{c.value}</h3>
              <p>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {expiryAlerts.length > 0 && (
        <div className="card expiry-card">
          <div className="card-header">
            <h2><ShieldAlert size={16} /> Document Expiry Alerts</h2>
            <span className="expiry-count-badge">{expiryAlerts.length} alert{expiryAlerts.length > 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrapper dash-table-desktop">
            <table>
              <thead>
                <tr>
                  <th>Vehicle No</th><th>Type</th><th>Document</th>
                  <th>Expiry Date</th><th>Remaining Days</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expiryAlerts.map((a, i) => (
                  <tr key={`${a.vehicle_no}-${a.document}-${i}`} className={`expiry-row-${expiryStatusClass(a.status)}`}>
                    <td className="td-bold">{a.vehicle_no}</td>
                    <td>{a.vehicle_type}</td>
                    <td>{a.document}</td>
                    <td>{a.expiry_date}</td>
                    <td>
                      {a.remaining_days < 0 ? (
                        <span className="expiry-chip expired">{Math.abs(a.remaining_days)}d overdue</span>
                      ) : (
                        <span className={`expiry-chip ${expiryStatusClass(a.status)}`}>{a.remaining_days}d left</span>
                      )}
                    </td>
                    <td>
                      <span className={`expiry-badge ${expiryStatusClass(a.status)}`}>
                        {a.status === 'Expired' && <AlertTriangle size={11} />}
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dash-cards-mobile">
            {expiryAlerts.map((a, i) => (
              <div key={`${a.vehicle_no}-${a.document}-${i}`} className="dash-alert-card">
                <div className="dash-alert-top">
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{a.vehicle_no}</span>
                  <span className={`expiry-badge ${expiryStatusClass(a.status)}`}>
                    {a.status === 'Expired' && <AlertTriangle size={11} />}
                    {a.status}
                  </span>
                </div>
                <div className="dash-alert-info">
                  <span>{a.document}</span>
                  <span style={{ color: 'var(--gray-400)' }}>{a.vehicle_type}</span>
                </div>
                <div className="dash-alert-bottom">
                  <span style={{ fontSize: 12 }}>{a.expiry_date}</span>
                  <span style={{ fontWeight: 700, fontSize: 12 }} className={`expiry-days ${expiryStatusClass(a.status)}`}>
                    {a.remaining_days < 0 ? `${Math.abs(a.remaining_days)}d overdue` : `${a.remaining_days}d left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-panels">
        <div className="card">
          <div className="card-header">
            <h2><Building2 size={18} /> Vendor-wise Report</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Vendor</th><th>Trips</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {stats.vendorWise?.length === 0 ? (
                  <tr><td colSpan={3} className="empty-cell">No data yet</td></tr>
                ) : stats.vendorWise?.map((v) => (
                  <tr key={v.vendor}>
                    <td style={{ fontWeight: 600 }}>{v.vendor}</td>
                    <td>{v.trips}</td>
                    <td className="amount">₹{(v.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2><BarChart3 size={18} /> Monthly Summary</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Month</th><th>Trips</th><th>Closed</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {stats.monthlySummary?.length === 0 ? (
                  <tr><td colSpan={4} className="empty-cell">No data yet</td></tr>
                ) : stats.monthlySummary?.map((m) => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 600 }}>{formatMonth(m.month)}</td>
                    <td>{m.trips}</td>
                    <td>{m.closed_count}</td>
                    <td className="amount">₹{(m.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2><TrendingUp size={18} /> Recent Trips</h2>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/trips')}>View All</button>
        </div>
        <div className="table-wrapper dash-table-desktop">
          <table>
            <thead>
              <tr>
                <th>Order ID</th><th>Date</th><th>From</th><th>To</th>
                <th>Vehicle Type</th><th>Vendor</th><th>KM</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.length === 0 ? (
                <tr><td colSpan={9} className="empty-cell">No trips yet. Create your first trip!</td></tr>
              ) : recentTrips.map(trip => (
                <tr key={trip.id} className={statusClass(trip.status)}>
                  <td style={{ fontWeight: 600 }}>{trip.order_id}</td>
                  <td>{trip.trip_date}</td>
                  <td>{trip.from_location}</td>
                  <td>{trip.to_location}</td>
                  <td>{trip.vehicle_type}</td>
                  <td>{trip.vendor}</td>
                  <td>{trip.distance_km}</td>
                  <td className="amount">₹{(trip.trip_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`status-badge ${statusClass(trip.status)}`}>
                      <span className="status-dot" />{trip.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dash-cards-mobile">
          {recentTrips.length === 0 ? (
            <div className="empty-state"><Package size={36} /><p>No trips yet. Create your first trip!</p></div>
          ) : recentTrips.map(trip => (
            <div key={trip.id} className={`trip-card ${statusClass(trip.status)}`}>
              <div className="trip-card-header" onClick={() => setExpandedRecent(expandedRecent === trip.id ? null : trip.id)}>
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
                <ChevronDown size={16} className={`trip-card-chevron ${expandedRecent === trip.id ? 'open' : ''}`} />
              </div>
              {expandedRecent === trip.id && (
                <div className="trip-card-body">
                  <div className="trip-card-details">
                    <DItem label="Vendor" value={trip.vendor} />
                    <DItem label="KM" value={trip.distance_km} />
                    <DItem label="Vehicle No" value={trip.vehicle_no} />
                    <DItem label="Driver" value={trip.driver_name} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function statusClass(s) {
  if (s === 'Not Closed') return 'not-closed';
  if (s === 'Closed') return 'closed';
  if (s === 'Cancelled') return 'cancelled';
  return '';
}

function DItem({ label, value }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '-'}</span>
    </div>
  );
}
