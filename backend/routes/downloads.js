const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

async function authFromQuery(req, res, next) {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await db.query(
      'SELECT id, username, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = userResult.rows[0];
    if (!user || user.is_active !== 1) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function getFilteredTrips(query) {
  const { status, from_date, to_date, search } = query;
  let sql = 'SELECT * FROM trips WHERE 1=1';
  const params = [];
  let idx = 1;
  if (status && status !== 'All') { sql += ` AND status = $${idx++}`; params.push(status); }
  if (from_date) { sql += ` AND trip_date >= $${idx++}`; params.push(from_date); }
  if (to_date) { sql += ` AND trip_date <= $${idx++}`; params.push(to_date); }
  if (search) {
    sql += ` AND (order_id ILIKE $${idx} OR from_location ILIKE $${idx} OR to_location ILIKE $${idx} OR vendor ILIKE $${idx++})`;
    const s = `%${search}%`;
    params.push(s);
  }
  sql += ' ORDER BY created_at DESC';
  const maxRows = parseInt(query.limit) || 500;
  sql += ` LIMIT $${idx++}`;
  params.push(Math.min(maxRows, 500));
  const result = await db.query(sql, params);
  return result.rows;
}

const thinBorder = { style: 'thin', color: { argb: 'FFD1D5DB' } };
const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

router.get('/excel', authFromQuery, async (req, res) => {
  try {
    const trips = await getFilteredTrips(req.query);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TransFleet Pro';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Trips Report', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const cols = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Order ID', key: 'order_id', width: 18 },
      { header: 'Date', key: 'trip_date', width: 12 },
      { header: 'Branch', key: 'branch', width: 8 },
      { header: 'Trip Base', key: 'trip_base', width: 18 },
      { header: 'Trip Type', key: 'trip_type', width: 18 },
      { header: 'From', key: 'from_location', width: 22 },
      { header: 'To', key: 'to_location', width: 22 },
      { header: 'Vehicle Type', key: 'vehicle_type', width: 14 },
      { header: 'Vehicle No', key: 'vehicle_no', width: 14 },
      { header: 'Driver', key: 'driver_name', width: 14 },
      { header: 'Vendor', key: 'vendor', width: 18 },
      { header: 'Pickup Plant', key: 'pickup_plant', width: 20 },
      { header: 'Delivery Plant', key: 'delivery_plant', width: 20 },
      { header: 'KM', key: 'distance_km', width: 8 },
      { header: 'Rate/KM', key: 'rate_per_km', width: 9 },
      { header: 'Amount (₹)', key: 'trip_amount', width: 13 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Remarks', key: 'remarks', width: 24 },
    ];
    sheet.columns = cols;

    // Title row — use dynamic last column letter
    const lastCol = sheet.getColumn(cols.length).letter;
    sheet.spliceRows(1, 0, []);
    sheet.spliceRows(1, 0, []);
    sheet.mergeCells(`A1:${lastCol}1`);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'TransFleet Pro - Vehicle Route Planning Report';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E40AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells(`A2:${lastCol}2`);
    const subCell = sheet.getCell('A2');
    const dateRange = req.query.from_date && req.query.to_date
      ? `${req.query.from_date} to ${req.query.to_date}`
      : `Generated: ${new Date().toLocaleDateString('en-IN')}`;
    subCell.value = `${dateRange} | Total Trips: ${trips.length} | Status: ${req.query.status || 'All'}`;
    subCell.font = { size: 10, color: { argb: 'FF6B7280' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // Header row (row 3)
    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 28;
    headerRow.eachCell(cell => { cell.border = allBorders; });

    // Data rows
    const activeTrips = trips.filter(t => t.status !== 'Cancelled');
    const totalKm = activeTrips.reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0);
    const totalAmt = activeTrips.reduce((s, t) => s + (parseFloat(t.trip_amount) || 0), 0);

    trips.forEach((trip, idx) => {
      const row = sheet.addRow({
        sno: idx + 1,
        ...trip,
      });

      row.eachCell(cell => { cell.border = allBorders; cell.alignment = { vertical: 'middle', wrapText: true }; });

      const amtCell = row.getCell('trip_amount');
      amtCell.numFmt = '#,##0.00';
      amtCell.alignment = { horizontal: 'right', vertical: 'middle' };
      const rateCell = row.getCell('rate_per_km');
      rateCell.numFmt = '#,##0.00';
      const kmCell = row.getCell('distance_km');
      kmCell.numFmt = '#,##0.0';

      if (trip.status === 'Cancelled') {
        row.font = { color: { argb: 'FFDC2626' }, italic: true, size: 10 };
        row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }; });
      } else if (trip.status === 'Closed') {
        row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; });
      } else if (idx % 2 === 1) {
        row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; });
      }
    });

    // Total row
    sheet.addRow({});
    const totRow = sheet.addRow({
      sno: '', order_id: '', trip_date: '', branch: '', trip_base: '', trip_type: '',
      from_location: '', to_location: '', vehicle_type: '', vehicle_no: '', driver_name: '',
      vendor: 'GRAND TOTAL', pickup_plant: '', delivery_plant: '',
      distance_km: totalKm, rate_per_km: '',
      trip_amount: totalAmt, status: `${activeTrips.length} active`, remarks: '',
    });
    totRow.font = { bold: true, size: 11 };
    totRow.eachCell(cell => {
      cell.border = allBorders;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      cell.alignment = { vertical: 'middle' };
    });
    totRow.getCell('trip_amount').numFmt = '#,##0.00';
    totRow.getCell('trip_amount').alignment = { horizontal: 'right', vertical: 'middle' };
    totRow.getCell('distance_km').numFmt = '#,##0.0';

    // Summary row
    const summaryRow = sheet.addRow({
      sno: '', order_id: `Not Closed: ${trips.filter(t => t.status === 'Not Closed').length}`,
      trip_date: '', branch: '',
      trip_base: `Closed: ${trips.filter(t => t.status === 'Closed').length}`,
      trip_type: '',
      from_location: `Cancelled: ${trips.filter(t => t.status === 'Cancelled').length}`,
    });
    summaryRow.font = { size: 9, color: { argb: 'FF6B7280' } };

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 3 }];

    // Auto-filter
    sheet.autoFilter = { from: 'A3', to: `${lastCol}${sheet.rowCount}` };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=TransFleet_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    workbook.xlsx.write(res).then(() => res.end());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/pdf', authFromQuery, async (req, res) => {
  try {
    const trips = await getFilteredTrips(req.query);
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape', bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=TransFleet_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    doc.pipe(res);

    const pageW = doc.page.width - 60;
    const startX = 30;
    const active = trips.filter(t => t.status !== 'Cancelled');
    const totalAmt = active.reduce((s, t) => s + (parseFloat(t.trip_amount) || 0), 0);
    const totalKm = active.reduce((s, t) => s + (parseFloat(t.distance_km) || 0), 0);

    function drawHeader() {
      // Blue banner
      doc.rect(0, 0, doc.page.width, 50).fill('#1E3A5F');
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#fff')
        .text('TransFleet Pro', startX, 14, { continued: true })
        .fontSize(10).font('Helvetica').fillColor('#93c5fd')
        .text('  Vehicle Route Planning Report');
      doc.fillColor('#000');
    }

    function drawSummaryBox() {
      const y = 60;
      const boxH = 42;
      const boxW = pageW / 4;

      const boxes = [
        { label: 'Total Trips', value: String(trips.length), color: '#2563eb' },
        { label: 'Active Trips', value: String(active.length), color: '#16a34a' },
        { label: 'Total KM', value: totalKm.toFixed(1), color: '#7c3aed' },
        { label: 'Total Amount', value: `Rs.${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#1e40af' },
      ];

      boxes.forEach((b, i) => {
        const x = startX + i * boxW;
        doc.roundedRect(x + 2, y, boxW - 4, boxH, 4).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fontSize(7).font('Helvetica').fillColor('#6b7280').text(b.label, x + 8, y + 6);
        doc.fontSize(12).font('Helvetica-Bold').fillColor(b.color).text(b.value, x + 8, y + 18);
      });

      doc.fillColor('#000');
      return y + boxH + 12;
    }

    drawHeader();
    let y = drawSummaryBox();

    // Date/filter info line
    const dateRange = req.query.from_date && req.query.to_date
      ? `Period: ${req.query.from_date} to ${req.query.to_date}`
      : `Generated: ${new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}`;
    const filterInfo = `${dateRange}  |  Status: ${req.query.status || 'All'}`;
    doc.fontSize(7).font('Helvetica').fillColor('#6b7280').text(filterInfo, startX, y);
    y += 14;

    // Table
    const headers = ['#', 'Order ID', 'Date', 'From', 'To', 'Vehicle', 'Vendor', 'Driver', 'Veh No', 'KM', 'Amount(₹)', 'Status'];
    const colW = [20, 72, 55, 80, 80, 50, 70, 60, 60, 30, 58, 42];
    const rowH = 16;

    function drawTableHeader(atY) {
      const totalW = colW.reduce((a, b) => a + b, 0);
      doc.rect(startX, atY, totalW, rowH + 2).fill('#1E3A5F');
      let x = startX;
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#fff');
      headers.forEach((h, i) => {
        doc.text(h, x + 3, atY + 5, { width: colW[i] - 6, lineBreak: false, align: 'left' });
        x += colW[i];
      });
      doc.fillColor('#000');
      return atY + rowH + 2;
    }

    function drawDataRow(values, atY, isAlt, statusType) {
      const totalW = colW.reduce((a, b) => a + b, 0);
      let bg = null;
      if (statusType === 'Cancelled') bg = '#fef2f2';
      else if (statusType === 'Closed') bg = '#f0fdf4';
      else if (isAlt) bg = '#f8fafc';

      if (bg) doc.rect(startX, atY, totalW, rowH).fill(bg);

      // Bottom border
      doc.moveTo(startX, atY + rowH).lineTo(startX + totalW, atY + rowH).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

      let x = startX;
      doc.font('Helvetica').fontSize(6.5);
      doc.fillColor(statusType === 'Cancelled' ? '#dc2626' : '#1f2937');
      values.forEach((val, i) => {
        const align = i >= 9 && i <= 10 ? 'right' : 'left';
        doc.text(String(val), x + 3, atY + 4, { width: colW[i] - 6, lineBreak: false, align });
        x += colW[i];
      });
      doc.fillColor('#000');
      return atY + rowH;
    }

    y = drawTableHeader(y);

    trips.forEach((trip, idx) => {
      if (y + rowH > doc.page.height - 50) {
        // Footer on current page
        drawPageFooter(doc);
        doc.addPage();
        drawHeader();
        y = 60;
        y = drawTableHeader(y);
      }
      y = drawDataRow([
        idx + 1,
        trip.order_id, trip.trip_date,
        (trip.from_location || '').substring(0, 25),
        (trip.to_location || '').substring(0, 25),
        trip.vehicle_type || '-',
        (trip.vendor || '').substring(0, 20),
        (trip.driver_name || '-').substring(0, 18),
        trip.vehicle_no || '-',
        (parseFloat(trip.distance_km) || 0).toFixed(1),
        (parseFloat(trip.trip_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 }),
        trip.status,
      ], y, idx % 2 === 1, trip.status);
    });

    // Grand total row
    const totalW = colW.reduce((a, b) => a + b, 0);
    doc.rect(startX, y, totalW, rowH + 2).fill('#dbeafe');
    doc.moveTo(startX, y).lineTo(startX + totalW, y).strokeColor('#1e40af').lineWidth(1).stroke();
    let x = startX;
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#1e40af');
    const totValues = ['', '', '', '', '', '', '', 'TOTAL', '', totalKm.toFixed(1), `Rs.${totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, `${active.length} active`];
    totValues.forEach((val, i) => {
      const align = i >= 9 && i <= 10 ? 'right' : 'left';
      doc.text(String(val), x + 3, y + 5, { width: colW[i] - 6, lineBreak: false, align });
      x += colW[i];
    });
    y += rowH + 8;

    // Status summary
    doc.fillColor('#6b7280').fontSize(7).font('Helvetica');
    doc.text(
      `Not Closed: ${trips.filter(t => t.status === 'Not Closed').length}  |  Closed: ${trips.filter(t => t.status === 'Closed').length}  |  Cancelled: ${trips.filter(t => t.status === 'Cancelled').length}`,
      startX, y
    );

    drawPageFooter(doc);

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function drawPageFooter(doc) {
  const y = doc.page.height - 25;
  doc.fontSize(6).font('Helvetica').fillColor('#9ca3af');
  doc.text('TransFleet Pro - Confidential', 30, y);
  doc.text(`Page ${doc.bufferedPageRange().start + doc.bufferedPageRange().count}`, doc.page.width - 80, y);
  doc.fillColor('#000');
}

module.exports = router;
