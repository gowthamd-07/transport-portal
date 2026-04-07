const express = require('express');
const router = express.Router();
const db = require('../database');
const { adminOnly } = require('../middleware/auth');

const VALID_STATUSES = ['Not Closed', 'Closed', 'Cancelled'];

const SORTABLE_COLS = [
  'order_id', 'trip_date', 'branch', 'from_location', 'to_location',
  'vehicle_type', 'vendor', 'vehicle_no', 'driver_name', 'distance_km',
  'trip_amount', 'total_packages', 'status', 'trip_base', 'created_at'
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function generateOrderId(tripDate) {
  const dateStr = tripDate.replace(/-/g, '');
  const result = await db.query(
    "SELECT order_id FROM trips WHERE trip_date = $1 ORDER BY id DESC LIMIT 1",
    [tripDate]
  );
  const last = result.rows[0];
  let seq = 1;
  if (last) {
    const parts = last.order_id.split('-');
    seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
  }
  return `TRP-${dateStr}-${String(seq).padStart(3, '0')}`;
}

function extractFields(body) {
  const dist = parseFloat(body.distance_km) || 0;
  const rate = parseFloat(body.rate_per_km) || 0;
  const manual = body.is_manual_amount ? 1 : 0;
  const amount = manual ? (parseFloat(body.trip_amount) || 0) : dist * rate;

  return {
    branch: body.branch || '',
    from_location: body.from_location || '', to_location: body.to_location || '',
    trip_type: body.trip_type || '', trip_base: body.trip_base || '',
    vehicle_type: body.vehicle_type || '',
    vendor: body.vendor || '', vehicle_no: body.vehicle_no || '',
    vehicle_reg: body.vehicle_reg || '', driver_name: body.driver_name || '',
    mobile_no: body.mobile_no || '',
    weight: parseFloat(body.weight) || 0,
    total_packages: parseInt(body.total_packages) || 0,
    pickup_plant: body.pickup_plant || '', delivery_plant: body.delivery_plant || '',
    distance_km: dist, rate_per_km: rate, trip_amount: amount,
    is_manual_amount: manual, remarks: body.remarks || '',
  };
}

function applyFilters(query) {
  const { status, from_date, to_date, search, vendor } = query;
  let where = ' WHERE 1=1';
  const params = [];
  let idx = 1;

  if (status && status !== 'All') { where += ` AND t.status = $${idx++}`; params.push(status); }
  if (vendor) { where += ` AND t.vendor = $${idx++}`; params.push(vendor); }
  if (from_date) { where += ` AND t.trip_date >= $${idx++}`; params.push(from_date); }
  if (to_date) { where += ` AND t.trip_date <= $${idx++}`; params.push(to_date); }
  if (search) {
    where += ` AND (t.order_id ILIKE $${idx} OR t.from_location ILIKE $${idx} OR t.to_location ILIKE $${idx} OR t.vendor ILIKE $${idx} OR t.vehicle_no ILIKE $${idx} OR t.branch ILIKE $${idx} OR t.driver_name ILIKE $${idx++})`;
    const s = `%${search}%`;
    params.push(s);
  }
  return { where, params, nextIdx: idx };
}

router.get('/', async (req, res) => {
  try {
    const { sort_by, sort_dir, page, per_page } = req.query;
    const { where, params, nextIdx } = applyFilters(req.query);

    const aggResult = await db.query(`
      SELECT COUNT(*) as total,
        COALESCE(SUM(CASE WHEN t.status = 'Closed' THEN t.trip_amount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN t.status = 'Closed' THEN t.distance_km ELSE 0 END), 0) as total_km
      FROM trips t ${where}
    `, params);
    const agg = aggResult.rows[0];

    let col = 't.created_at';
    if (sort_by && SORTABLE_COLS.includes(sort_by)) col = `t.${sort_by}`;
    const dir = sort_dir === 'asc' ? 'ASC' : 'DESC';

    const limit = Math.min(Math.max(parseInt(per_page) || 25, 5), 200);
    const currentPage = Math.max(parseInt(page) || 1, 1);
    const offset = (currentPage - 1) * limit;

    const queryParams = [...params, limit, offset];
    const rowsResult = await db.query(`
      SELECT t.*, u.full_name as created_by_name
      FROM trips t LEFT JOIN users u ON t.created_by = u.id
      ${where} ORDER BY ${col} ${dir} LIMIT $${nextIdx} OFFSET $${nextIdx + 1}
    `, queryParams);

    res.json({
      data: rowsResult.rows,
      pagination: { page: currentPage, per_page: limit, total: parseInt(agg.total), total_pages: Math.ceil(parseInt(agg.total) / limit) || 1 },
      summary: { total_trips: parseInt(agg.total), total_amount: parseFloat(agg.total_amount), total_km: parseFloat(agg.total_km) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const totalResult = await db.query('SELECT COUNT(*) as c FROM trips');
    const notClosedResult = await db.query("SELECT COUNT(*) as c FROM trips WHERE status = 'Not Closed'");
    const closedResult = await db.query("SELECT COUNT(*) as c FROM trips WHERE status = 'Closed'");
    const cancelledResult = await db.query("SELECT COUNT(*) as c FROM trips WHERE status = 'Cancelled'");
    const totalRevenueResult = await db.query("SELECT COALESCE(SUM(trip_amount), 0) as t FROM trips WHERE status != 'Cancelled'");
    const todayTripsResult = await db.query("SELECT COUNT(*) as c FROM trips WHERE trip_date = $1", [today]);
    const todayRevenueResult = await db.query("SELECT COALESCE(SUM(trip_amount), 0) as t FROM trips WHERE trip_date = $1 AND status != 'Cancelled'", [today]);

    const vendorWiseResult = await db.query(`
      SELECT vendor, COUNT(*) as trips, COALESCE(SUM(trip_amount), 0) as revenue
      FROM trips WHERE status != 'Cancelled' GROUP BY vendor ORDER BY revenue DESC LIMIT 10
    `);

    const monthlySummaryResult = await db.query(`
      SELECT substring(trip_date, 1, 7) as month,
        COUNT(*) as trips,
        COALESCE(SUM(trip_amount), 0) as revenue,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed_count
      FROM trips WHERE status != 'Cancelled'
      GROUP BY month ORDER BY month DESC LIMIT 12
    `);

    res.json({
      total: parseInt(totalResult.rows[0].c), 
      notClosed: parseInt(notClosedResult.rows[0].c), 
      closed: parseInt(closedResult.rows[0].c), 
      cancelled: parseInt(cancelledResult.rows[0].c), 
      totalRevenue: parseFloat(totalRevenueResult.rows[0].t),
      todayTrips: parseInt(todayTripsResult.rows[0].c), 
      todayRevenue: parseFloat(todayRevenueResult.rows[0].t), 
      vendorWise: vendorWiseResult.rows.map(r => ({ ...r, trips: parseInt(r.trips), revenue: parseFloat(r.revenue) })), 
      monthlySummary: monthlySummaryResult.rows.map(r => ({ ...r, trips: parseInt(r.trips), revenue: parseFloat(r.revenue), closed_count: parseInt(r.closed_count) })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const tripResult = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = tripResult.rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { from_location, to_location, vehicle_type, vendor } = req.body;
    if (!from_location || !to_location || !vehicle_type || !vendor) {
      return res.status(400).json({ error: 'From, To, Vehicle Type and Vendor are required' });
    }

    const date = req.body.trip_date || new Date().toISOString().slice(0, 10);
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const order_id = await generateOrderId(date);
    const f = extractFields(req.body);

    if (f.vehicle_no) {
      await db.query("UPDATE vehicles SET status = 'On Trip' WHERE vehicle_no = $1 AND status = 'Available'", [f.vehicle_no]);
    }
    if (f.driver_name) {
      await db.query("UPDATE drivers SET status = 'On Trip' WHERE name = $1 AND status = 'Available'", [f.driver_name]);
    }

    const cols = ['order_id', 'trip_date', ...Object.keys(f), 'created_by'];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const vals = [order_id, date, ...Object.values(f), req.user.id];

    const result = await db.query(`INSERT INTO trips (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`, vals);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: Not Closed, Closed, or Cancelled' });
    }
    const tripResult = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = tripResult.rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status === 'Cancelled') return res.status(400).json({ error: 'Cannot change cancelled trip' });

    await db.query("UPDATE trips SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [status, req.params.id]);

    if (status === 'Closed' || status === 'Cancelled') {
      if (trip.vehicle_no) {
        await db.query("UPDATE vehicles SET status = 'Available' WHERE vehicle_no = $1 AND status = 'On Trip'", [trip.vehicle_no]);
      }
      if (trip.driver_name) {
        await db.query("UPDATE drivers SET status = 'Available' WHERE name = $1 AND status = 'On Trip'", [trip.driver_name]);
      }
    }

    const updated = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const tripResult = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = tripResult.rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Free up vehicle and driver status if the trip was active
    if (trip.status === 'Not Closed') {
      if (trip.vehicle_no) {
        await db.query("UPDATE vehicles SET status = 'Available' WHERE vehicle_no = $1 AND status = 'On Trip'", [trip.vehicle_no]);
      }
      if (trip.driver_name) {
        await db.query("UPDATE drivers SET status = 'Available' WHERE name = $1 AND status = 'On Trip'", [trip.driver_name]);
      }
    }

    await db.query('DELETE FROM trips WHERE id = $1', [req.params.id]);
    res.json({ message: `Trip ${trip.order_id} deleted successfully` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const tripResult = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    const trip = tripResult.rows[0];
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status === 'Cancelled') return res.status(400).json({ error: 'Cannot edit cancelled trip' });

    const f = extractFields(req.body);

    if (trip.vehicle_no && trip.vehicle_no !== f.vehicle_no) {
      await db.query("UPDATE vehicles SET status = 'Available' WHERE vehicle_no = $1", [trip.vehicle_no]);
    }
    if (f.vehicle_no && f.vehicle_no !== trip.vehicle_no) {
      await db.query("UPDATE vehicles SET status = 'On Trip' WHERE vehicle_no = $1 AND status = 'Available'", [f.vehicle_no]);
    }
    if (trip.driver_name && trip.driver_name !== f.driver_name) {
      await db.query("UPDATE drivers SET status = 'Available' WHERE name = $1", [trip.driver_name]);
    }
    if (f.driver_name && f.driver_name !== trip.driver_name) {
      await db.query("UPDATE drivers SET status = 'On Trip' WHERE name = $1 AND status = 'Available'", [f.driver_name]);
    }

    let idx = 1;
    const sets = Object.keys(f).map(k => `${k} = $${idx++}`).join(', ');
    const vals = Object.values(f);
    vals.push(req.params.id);

    await db.query(`UPDATE trips SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`, vals);
    const updated = await db.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
