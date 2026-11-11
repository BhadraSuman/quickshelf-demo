import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { HighlightFleetService, getHighlightClient } from '../services/highlight.service.js';

export async function registerHighlightRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/highlight/status
   * Check connection and overview of the Highlight cloud organization
   */
  app.get('/api/highlight/status', async () => {
    try {
      const client = getHighlightClient();
      const devices = await client.searchAllDevice({ pageNum: 1, pageSize: 10 });

      return {
        success: true,
        connected: true,
        organization: 'CU006INDIA0344',
        deviceTotal: devices.total ?? devices.data?.length ?? 0,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        connected: false,
        error: err.message,
      };
    }
  });

  /**
   * POST /api/highlight/sync
   * Full fleet synchronization from Highlight Cloud to local state / PostgreSQL
   */
  app.post('/api/highlight/sync', async (request, reply) => {
    try {
      const { storeId } = (request.body as { storeId?: string }) || {};
      const result = await HighlightFleetService.syncFleet(storeId);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message,
      });
    }
  });

  /**
   * GET /api/highlight/devices
   * List all real physical devices across the fleet
   */
  app.get('/api/highlight/devices', async (request, reply) => {
    try {
      const query = request.query as { pageNum?: string; pageSize?: string; deviceNumber?: string };
      const client = getHighlightClient();
      const res = await client.searchAllDevice({
        pageNum: query.pageNum ? parseInt(query.pageNum) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize) : 100,
        deviceNumber: query.deviceNumber,
      });
      const enrichedDevices = (res.data || []).map((dev) => ({
        ...dev,
        templateId: dev.templateList?.[0] ? String(dev.templateList[0]) : (dev as any).templateId,
      }));
      return reply.send({
        success: true,
        devices: enrichedDevices,
        total: res.total,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/highlight/templates
   * List all e-paper templates available on the Highlight server
   */
  app.get('/api/highlight/templates', async (_request, reply) => {
    try {
      const client = getHighlightClient();
      const res = await client.searchAllTemplate({ pageNum: 1, pageSize: 50 });
      return reply.send({
        success: true,
        templates: res.data || [],
        total: res.total,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/highlight/products
   * Query all products currently registered in Highlight Cloud Catalog
   */
  app.get('/api/highlight/products', async (request, reply) => {
    try {
      const query = request.query as { pageNum?: string; pageSize?: string; uniqueId?: string; prodName?: string };
      const client = getHighlightClient();
      const res = await client.searchAllProduct({
        pageNum: query.pageNum ? parseInt(query.pageNum) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize) : 100,
        uniqueId: query.uniqueId,
        prodName: query.prodName,
      });
      return reply.send({
        success: true,
        products: res.data || [],
        total: res.total ?? res.data?.length ?? 0,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/push-price
   * Live price update dispatched over-the-air to physical ESL tag
   */
  app.post('/api/highlight/push-price', async (request, reply) => {
    const body = (request.body as any) || {};
    const tagHardwareId = body.tagHardwareId || body.deviceNumber;
    const skuCode = body.skuCode;
    const prodName = body.prodName || body.skuName || 'QuickShelf Item';
    const priceMinor =
      body.priceMinor !== undefined
        ? Number(body.priceMinor)
        : body.price !== undefined
        ? Math.round(Number(body.price) * 100)
        : NaN;
    const mrpMinor =
      body.mrpMinor !== undefined
        ? Number(body.mrpMinor)
        : body.mrp !== undefined
        ? Math.round(Number(body.mrp) * 100)
        : priceMinor;

    if (!tagHardwareId || !skuCode || isNaN(priceMinor) || priceMinor <= 0) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required parameters: deviceNumber (or tagHardwareId), skuCode, and price',
      });
    }

    try {
      const result = await HighlightFleetService.pushPriceUpdate({
        tagHardwareId,
        skuCode,
        prodName,
        priceMinor,
        mrpMinor: isNaN(mrpMinor) ? priceMinor : mrpMinor,
        promoBadge: body.promoBadge || null,
        templateId: body.templateId ? Number(body.templateId) : undefined,
        hindiName: body.hindiName,
      });
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/locate
   * Query device status & RF telemetry from base station
   */
  app.post('/api/highlight/locate', async (request, reply) => {
    const { deviceNumber } = (request.body as { deviceNumber: string }) || {};
    if (!deviceNumber) {
      return reply.status(400).send({ success: false, error: 'deviceNumber is required' });
    }

    try {
      const device = await HighlightFleetService.locateDevice(deviceNumber);
      return reply.send({
        success: true,
        message: `Retrieved live telemetry for ESL tag ${deviceNumber}`,
        device,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/flash
   * Trigger over-the-air LED flash (Pick-to-Light) on physical ESL tag(s)
   * Highlight V5.0.25 §7.3 <eslFlash>
   */
  app.post('/api/highlight/flash', async (request, reply) => {
    const body = (request.body as any) || {};
    const deviceNumber = body.deviceNumber || body.tagHardwareId;
    const deviceNumberList = body.deviceNumberList || (deviceNumber ? [deviceNumber] : undefined);
    const uniqueIdList = body.uniqueIdList || (body.skuCode ? [body.skuCode] : undefined);
    const lightColor = Number(body.lightColor) || 2; // Default 2: Green
    const lightTime = Number(body.lightTime) || 30; // Default 30s

    if (!deviceNumberList && !uniqueIdList) {
      return reply.status(400).send({
        success: false,
        error: 'Either deviceNumber (deviceNumberList) or uniqueId (uniqueIdList) is required',
      });
    }

    try {
      const result = await HighlightFleetService.flashTagLed({
        deviceNumberList,
        uniqueIdList,
        lightColor,
        lightTime,
      });
      return reply.send({
        success: true,
        message: `Queued LED flash (${lightColor}) for ${lightTime}s on tag(s)`,
        result,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/flash-stop
   * Stop LED flash on physical ESL tag(s)
   * Highlight V5.0.25 §7.4 <eslFlashStop>
   */
  app.post('/api/highlight/flash-stop', async (request, reply) => {
    const body = (request.body as any) || {};
    const deviceNumber = body.deviceNumber || body.tagHardwareId;
    const deviceNumberList = body.deviceNumberList || (deviceNumber ? [deviceNumber] : undefined);
    const uniqueIdList = body.uniqueIdList || (body.skuCode ? [body.skuCode] : undefined);

    try {
      const result = await HighlightFleetService.stopTagLed({
        deviceNumberList,
        uniqueIdList,
      });
      return reply.send({
        success: true,
        message: 'Stopped LED flash on tag(s)',
        result,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/bind
   * Bind product to ESL tag (with automatic catalog sync if product details provided)
   */
  app.post('/api/highlight/bind', async (request, reply) => {
    const body = (request.body as any) || {};
    const deviceNumber = body.deviceNumber || body.tagHardwareId;
    const templateId = Number(body.templateId) || 1213;
    const stationId = body.stationId;

    const skuCode = body.skuCode || body.uniqueId || (body.uniqueIdList && body.uniqueIdList[0]);
    if (!deviceNumber || !skuCode) {
      return reply.status(400).send({
        success: false,
        error: 'deviceNumber and skuCode (or uniqueIdList) are required',
      });
    }

    try {
      const client = getHighlightClient();

      // If rich product details are provided, sync catalog first
      if (body.prodName || body.price !== undefined || body.priceMinor !== undefined) {
        const sellingPrice =
          body.price !== undefined
            ? Number(body.price)
            : body.priceMinor !== undefined
            ? Number(body.priceMinor) / 100
            : 100;
        const mrp =
          body.mrp !== undefined
            ? Number(body.mrp)
            : body.mrpMinor !== undefined
            ? Number(body.mrpMinor) / 100
            : sellingPrice;

        const productPayload = {
          uniqueId: skuCode,
          prodName: body.prodName || 'QuickShelf Item',
          price: sellingPrice,
          priceUnit: body.priceUnit || '₹',
          commodityUnit: body.commodityUnit || '1 unit',
          copyWriting: body.promoBadge || 'Regular Price',
          custFeature1: body.hindiName || '',
          custFeature2: `MRP: ₹${mrp.toFixed(0)}`,
          custFeature3: body.promoBadge ? `SAVE ₹${(mrp - sellingPrice).toFixed(0)}` : '',
        };

        try {
          await client.updateProduct(productPayload);
        } catch {
          await client.createProduct(productPayload);
        }
      }

      const uniqueIdList = body.uniqueIdList || [skuCode];
      await client.bindingPos({
        deviceNumber,
        templateId,
        uniqueIdList,
        stationId,
      });

      return reply.send({
        success: true,
        message: `Successfully bound SKU "${skuCode}" to ESL tag ${deviceNumber} (Template ${templateId}).`,
        deviceNumber,
        templateId,
        skuCode,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/unbind
   * Unbind product from ESL tag and return to standby pool
   */
  app.post('/api/highlight/unbind', async (request, reply) => {
    const body = (request.body as any) || {};
    const deviceNumber = body.deviceNumber || body.tagHardwareId;
    const stationId = body.stationId;

    if (!deviceNumber) {
      return reply.status(400).send({ success: false, error: 'deviceNumber is required' });
    }

    try {
      const client = getHighlightClient();
      await client.unboundPos({ deviceNumber, stationId });
      return reply.send({
        success: true,
        message: `Successfully unbound ESL tag ${deviceNumber}. Tag returned to standby inventory.`,
        deviceNumber,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/batch-create-products
   * Bulk insert multiple commodities into Highlight Cloud Catalog
   */
  app.post('/api/highlight/batch-create-products', async (request, reply) => {
    const { products } = (request.body as { products: any[] }) || {};
    if (!products || !Array.isArray(products) || products.length === 0) {
      return reply.status(400).send({ success: false, error: 'products array is required' });
    }

    try {
      const client = getHighlightClient();
      const formatted = products.map((p) => ({
        uniqueId: p.uniqueId || p.skuCode,
        prodName: p.prodName || p.skuName || 'QuickShelf Item',
        price: Number(p.price) || 0,
        priceUnit: p.priceUnit || '₹',
        commodityUnit: p.commodityUnit || '1 unit',
        copyWriting: p.promoBadge || p.copyWriting || '',
        custFeature1: p.hindiName || p.custFeature1 || '',
        custFeature2: p.mrp ? `MRP: ₹${Number(p.mrp).toFixed(0)}` : '',
        custFeature3: p.promoBadge ? `PROMO: ${p.promoBadge}` : '',
      }));

      await client.batchCreateProduct(formatted);
      return reply.send({
        success: true,
        message: `Successfully batch-created ${formatted.length} products in Highlight Catalog.`,
        total: formatted.length,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/batch-update-products
   * Bulk update prices and attributes across multiple products in Highlight Catalog
   */
  app.post('/api/highlight/batch-update-products', async (request, reply) => {
    const { products } = (request.body as { products: any[] }) || {};
    if (!products || !Array.isArray(products) || products.length === 0) {
      return reply.status(400).send({ success: false, error: 'products array is required' });
    }

    try {
      const client = getHighlightClient();
      const formatted = products.map((p) => ({
        uniqueId: p.uniqueId || p.skuCode,
        prodName: p.prodName || p.skuName || 'QuickShelf Item',
        price: Number(p.price) || 0,
        priceUnit: p.priceUnit || '₹',
        commodityUnit: p.commodityUnit || '1 unit',
        copyWriting: p.promoBadge || p.copyWriting || '',
        custFeature1: p.hindiName || p.custFeature1 || '',
        custFeature2: p.mrp ? `MRP: ₹${Number(p.mrp).toFixed(0)}` : '',
        custFeature3: p.promoBadge ? `PROMO: ${p.promoBadge}` : '',
      }));

      await client.batchUpdateProduct(formatted);
      return reply.send({
        success: true,
        message: `Successfully batch-updated ${formatted.length} products in Highlight Catalog.`,
        total: formatted.length,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/batch-del-products
   * Bulk delete products from Highlight Catalog
   */
  app.post('/api/highlight/batch-del-products', async (request, reply) => {
    const { uniqueIds } = (request.body as { uniqueIds: string[] }) || {};
    if (!uniqueIds || !Array.isArray(uniqueIds) || uniqueIds.length === 0) {
      return reply.status(400).send({ success: false, error: 'uniqueIds array is required' });
    }

    try {
      const client = getHighlightClient();
      await client.batchDelProduct(uniqueIds);
      return reply.send({
        success: true,
        message: `Successfully deleted ${uniqueIds.length} products from Highlight Catalog.`,
        total: uniqueIds.length,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/devices/update
   * Modify physical ESL device nickname in Highlight Cloud
   */
  app.post('/api/highlight/devices/update', async (request, reply) => {
    const { deviceNumber, deviceName } = (request.body as { deviceNumber: string; deviceName: string }) || {};
    if (!deviceNumber || !deviceName) {
      return reply.status(400).send({ success: false, error: 'deviceNumber and deviceName are required' });
    }

    try {
      const client = getHighlightClient();
      await client.updateDevice({ deviceNumber, deviceName });
      return reply.send({
        success: true,
        message: `Updated device ${deviceNumber} name to "${deviceName}".`,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/devices/create
   * Register a new physical ESL device in Highlight Cloud
   */
  app.post('/api/highlight/devices/create', async (request, reply) => {
    const { deviceNumber, deviceName } = (request.body as { deviceNumber: string; deviceName?: string }) || {};
    if (!deviceNumber) {
      return reply.status(400).send({ success: false, error: 'deviceNumber is required' });
    }

    try {
      const client = getHighlightClient();
      await client.createDevice({ deviceNumber, deviceName: deviceName || deviceNumber });
      return reply.send({
        success: true,
        message: `Registered device ${deviceNumber} in Highlight Cloud.`,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/devices/delete
   * Delete physical ESL device from Highlight Cloud
   */
  app.post('/api/highlight/devices/delete', async (request, reply) => {
    const { deviceNumber } = (request.body as { deviceNumber: string }) || {};
    if (!deviceNumber) {
      return reply.status(400).send({ success: false, error: 'deviceNumber is required' });
    }

    try {
      const client = getHighlightClient();
      await client.delDevice(deviceNumber);
      return reply.send({
        success: true,
        message: `Deleted device ${deviceNumber} from Highlight Cloud.`,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/stations/update
   * Modify AP Base Station nickname
   */
  app.post('/api/highlight/stations/update', async (request, reply) => {
    const { stationId, stationName } = (request.body as { stationId: string; stationName: string }) || {};
    if (!stationId || !stationName) {
      return reply.status(400).send({ success: false, error: 'stationId and stationName are required' });
    }

    try {
      const client = getHighlightClient();
      await client.updateStation({ stationId, stationName });
      return reply.send({
        success: true,
        message: `Updated base station ${stationId} name to "${stationName}".`,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/highlight/import-devices-csv
   * Ingest Highlight's standard batch device CSV or XLSX format:
   * "*Barcode,Device name,Organization(CU006INDIA0344:483)"
   */
  app.post('/api/highlight/import-devices-csv', async (request, reply) => {
    const { csvContent, fileBase64 } = (request.body as { csvContent?: string; fileBase64?: string }) || {};
    if (!csvContent && !fileBase64) {
      return reply.status(400).send({ success: false, error: 'Either csvContent or fileBase64 is required' });
    }

    try {
      const client = getHighlightClient();
      let entries: { barcode: string; deviceName: string }[] = [];

      if (fileBase64) {
        const buf = Buffer.from(fileBase64, 'base64');
        const wb = XLSX.read(buf, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        for (const row of rows) {
          if (!row || row.length === 0) continue;
          const col0 = String(row[0] || '').trim();
          const col1 = String(row[1] || '').trim();

          if (
            col0.startsWith('Note') ||
            col0.startsWith('<') ||
            col0.toLowerCase().startsWith('device information') ||
            col0.startsWith('*Barcode') ||
            col0.startsWith('Barcode')
          ) {
            continue;
          }

          if (col0 && /^\d+$/.test(col0)) {
            entries.push({ barcode: col0, deviceName: col1 });
          }
        }
      } else if (csvContent) {
        const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (
            line.startsWith('"Note') ||
            line.startsWith('Note') ||
            line.startsWith('<') ||
            line.toLowerCase().startsWith('device information') ||
            line.startsWith('*Barcode') ||
            line.startsWith('Barcode')
          ) {
            continue;
          }

          const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
          const barcode = parts[0];
          const deviceName = parts[1] || '';

          if (barcode && /^\d+$/.test(barcode)) {
            entries.push({ barcode, deviceName });
          }
        }
      }

      const results: { barcode: string; name?: string; status: 'updated' | 'created' | 'error'; error?: string }[] = [];

      for (const entry of entries) {
        try {
          await client.updateDevice({ deviceNumber: entry.barcode, deviceName: entry.deviceName });
          results.push({ barcode: entry.barcode, name: entry.deviceName, status: 'updated' });
        } catch {
          try {
            await client.createDevice({ deviceNumber: entry.barcode, deviceName: entry.deviceName });
            results.push({ barcode: entry.barcode, name: entry.deviceName, status: 'created' });
          } catch (err: any) {
            results.push({ barcode: entry.barcode, name: entry.deviceName, status: 'error', error: err.message });
          }
        }
      }

      return reply.send({
        success: true,
        message: `Processed ${results.length} devices from Highlight batch sheet.`,
        total: results.length,
        results,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/highlight/export-devices-csv
   * Export fleet devices in Highlight's exact CSV template format
   */
  app.get('/api/highlight/export-devices-csv', async (_request, reply) => {
    try {
      const client = getHighlightClient();
      const res = await client.searchAllDevice({ pageNum: 1, pageSize: 100 });
      const devices = res.data || [];

      let csv = `"Note\n<1>Field name in red color is mandatory\n<2>Revise device ID is prohibited\n<3>Revise or delete organization ID is prohibited",,\nDevice information,,\n*Barcode,Device name,Organization(CU006INDIA0344:483)\n`;

      for (const dev of devices) {
        csv += `${dev.deviceNumber},${dev.deviceName || dev.deviceNumber},CU006INDIA0344:483\n`;
      }

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="Highlight_Device_List_CU006INDIA0344.csv"');
      return reply.send(csv);
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/highlight/export-devices-xlsx
   * Export fleet devices in Highlight's exact official Excel (.xlsx) template format
   */
  app.get('/api/highlight/export-devices-xlsx', async (_request, reply) => {
    try {
      const client = getHighlightClient();
      const res = await client.searchAllDevice({ pageNum: 1, pageSize: 100 });
      const devices = res.data || [];

      const rows = [
        ['Note\n<1>Field name in red color is mandatory\n<2>Revise device ID is prohibited\n<3>Revise or delete organization ID is prohibited', null, null],
        ['Device information', null, null],
        ['*Barcode', 'Device name', 'Organization(CU006INDIA0344:483)'],
      ];

      for (const dev of devices) {
        rows.push([dev.deviceNumber, dev.deviceName || dev.deviceNumber, 'CU006INDIA0344:483']);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Device information');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="Device_information_format_CU006INDIA0344.xlsx"');
      return reply.send(buf);
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}
