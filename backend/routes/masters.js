const express = require('express');
const router = express.Router();
const db = require('../database');

function simpleCrud(tableName, labelSingular) {
  const getAll = async (_req, res) => {
    try {
      const result = await db.query(`SELECT * FROM ${tableName} ORDER BY name`);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  };

  const create = async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const val = ['vehicle_types', 'branches'].includes(tableName) ? name.toUpperCase() : name;
      await db.query(`INSERT INTO ${tableName} (name) VALUES ($1)`, [val]);
      res.status(201).json({ message: `${labelSingular} added` });
    } catch (err) {
      if (err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
        return res.status(409).json({ error: `${labelSingular} already exists` });
      }
      res.status(500).json({ error: err.message });
    }
  };

  const remove = async (req, res) => {
    try {
      const result = await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: `${labelSingular} not found` });
      res.json({ message: `${labelSingular} deleted` });
    } catch (err) { res.status(500).json({ error: err.message }); }
  };

  return { getAll, create, remove };
}

[
  { path: 'vehicle-types', table: 'vehicle_types', label: 'Vehicle type' },
  { path: 'vendors', table: 'vendors', label: 'Vendor' },
  { path: 'plants', table: 'plants', label: 'Plant' },
  { path: 'locations', table: 'locations', label: 'Location' },
  { path: 'branches', table: 'branches', label: 'Branch' },
  { path: 'trip-bases', table: 'trip_bases', label: 'Trip base' },
  { path: 'trip-types', table: 'trip_types', label: 'Trip type' },
].forEach(({ path: p, table, label }) => {
  const { getAll, create, remove } = simpleCrud(table, label);
  router.get(`/${p}`, getAll);
  router.post(`/${p}`, create);
  router.delete(`/${p}/:id`, remove);
});

// ===== Vehicles =====
router.get('/vehicles', async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM vehicles ORDER BY vehicle_no');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/vehicles', async (req, res) => {
  try {
    const { vehicle_no, vehicle_reg, vehicle_type, owner_name, fc_expiry, pollution_expiry, insurance_expiry, tax_expiry, permit_expiry } = req.body;
    if (!vehicle_no || !vehicle_type) return res.status(400).json({ error: 'Vehicle No and Type are required' });
    const result = await db.query(
      'INSERT INTO vehicles (vehicle_no, vehicle_reg, vehicle_type, owner_name, fc_expiry, pollution_expiry, insurance_expiry, tax_expiry, permit_expiry) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        vehicle_no.toUpperCase(), vehicle_reg || vehicle_no.toUpperCase(), vehicle_type, owner_name || '',
        fc_expiry || '', pollution_expiry || '', insurance_expiry || '', tax_expiry || '', permit_expiry || ''
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
      return res.status(409).json({ error: 'Vehicle already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/vehicles/:id', async (req, res) => {
  try {
    const vResult = await db.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    const v = vResult.rows[0];
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    const ALLOWED = ['vehicle_reg', 'vehicle_type', 'owner_name', 'status', 'fc_expiry', 'pollution_expiry', 'insurance_expiry', 'tax_expiry', 'permit_expiry'];
    const VALID_STATUS = ['Available', 'On Trip', 'Maintenance', 'Inactive'];
    if (req.body.status && !VALID_STATUS.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid vehicle status' });
    }
    const updates = ALLOWED.filter(f => req.body[f] !== undefined);
    if (updates.length === 0) return res.json(v);
    
    let idx = 1;
    const sets = updates.map(f => `${f} = $${idx++}`).join(', ');
    const vals = updates.map(f => req.body[f]);
    vals.push(v.id);
    
    await db.query(`UPDATE vehicles SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`, vals);
    const updated = await db.query('SELECT * FROM vehicles WHERE id = $1', [v.id]);
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/vehicles/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Drivers =====
router.get('/drivers', async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM drivers ORDER BY name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/drivers', async (req, res) => {
  try {
    const { name, mobile_no, license_no, vehicle_no } = req.body;
    if (!name || !mobile_no) return res.status(400).json({ error: 'Name and Mobile No are required' });
    const result = await db.query(
      'INSERT INTO drivers (name, mobile_no, license_no, vehicle_no) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, mobile_no, license_no || '', vehicle_no || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
      return res.status(409).json({ error: 'Driver mobile already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/drivers/:id', async (req, res) => {
  try {
    const dResult = await db.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    const d = dResult.rows[0];
    if (!d) return res.status(404).json({ error: 'Driver not found' });
    const ALLOWED = ['name', 'license_no', 'vehicle_no', 'status'];
    const VALID_STATUS = ['Available', 'On Trip', 'On Leave', 'Inactive'];
    if (req.body.status && !VALID_STATUS.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid driver status' });
    }
    const updates = ALLOWED.filter(f => req.body[f] !== undefined);
    if (updates.length === 0) return res.json(d);
    
    let idx = 1;
    const sets = updates.map(f => `${f} = $${idx++}`).join(', ');
    const vals = updates.map(f => req.body[f]);
    vals.push(d.id);
    
    await db.query(`UPDATE drivers SET ${sets} WHERE id = $${idx}`, vals);
    const updated = await db.query('SELECT * FROM drivers WHERE id = $1', [d.id]);
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/drivers/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM drivers WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json({ message: 'Driver deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== Expiry Stats =====
router.get('/expiry-alerts', async (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await db.query('SELECT id, vehicle_no, vehicle_type, fc_expiry, pollution_expiry, insurance_expiry, tax_expiry, permit_expiry FROM vehicles WHERE status != $1', ['Inactive']);
    const vehicles = result.rows;

    const alerts = [];
    const docTypes = [
      { key: 'fc_expiry', label: 'FC' },
      { key: 'pollution_expiry', label: 'Pollution' },
      { key: 'insurance_expiry', label: 'Insurance' },
      { key: 'tax_expiry', label: 'Tax' },
      { key: 'permit_expiry', label: 'Permit' },
    ];

    vehicles.forEach(v => {
      docTypes.forEach(({ key, label }) => {
        if (v[key]) {
          const expiry = v[key];
          const diff = Math.ceil((new Date(expiry) - new Date(today)) / 86400000);
          if (diff <= 90) {
            alerts.push({
              vehicle_no: v.vehicle_no,
              vehicle_type: v.vehicle_type,
              document: label,
              expiry_date: expiry,
              remaining_days: diff,
              status: diff < 0 ? 'Expired' : diff <= 15 ? 'Critical' : diff <= 30 ? 'Warning' : 'Upcoming',
            });
          }
        }
      });
    });

    alerts.sort((a, b) => a.remaining_days - b.remaining_days);
    res.json(alerts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
