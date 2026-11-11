import { HighlightClient, type DeviceApiDTO, type StationDTO, type TemplateApiDTO } from '@quickshelf/highlight-client';
import { getConfig } from '@quickshelf/config';
import { db, GatewayStatus } from '@quickshelf/db';

let clientInstance: HighlightClient | null = null;

export function getHighlightClient(): HighlightClient {
  if (!clientInstance) {
    const config = getConfig();
    clientInstance = new HighlightClient({
      appKey: config.HIGHLIGHT_APP_KEY,
      appSecret: config.HIGHLIGHT_APP_SECRET,
      endpoint: config.HIGHLIGHT_ENDPOINT,
      lang: 'en_US',
    });
  }
  return clientInstance;
}

export interface HighlightFleetSyncResult {
  success: boolean;
  syncedAt: string;
  organization: string;
  stations: StationDTO[];
  devices: DeviceApiDTO[];
  templates: TemplateApiDTO[];
  persistedToDb: boolean;
  dbError?: string;
}

export class HighlightFleetService {
  /**
   * Synchronize all physical AP gateways, tags, and templates from Highlight Cloud API.
   * Gracefully updates DB if connected, otherwise maintains in-memory sync.
   */
  public static async syncFleet(storeId?: string): Promise<HighlightFleetSyncResult> {
    const client = getHighlightClient();
    const config = getConfig();

    console.log(`[HighlightService] Starting fleet synchronization for org ${config.HIGHLIGHT_ORG_CODE}...`);

    // 1. Fetch live data from Highlight Cloud sequentially to avoid server concurrency locks
    const devicesRes = await client.searchAllDevice({ pageNum: 1, pageSize: 200 }).catch((e: any) => {
      console.error('[HighlightService] searchAllDevice failed:', e.message);
      return { data: [] as DeviceApiDTO[] };
    });

    await new Promise((r) => setTimeout(r, 200));

    const templatesRes = await client.searchAllTemplate({ pageNum: 1, pageSize: 50 }).catch((e: any) => {
      console.error('[HighlightService] searchAllTemplate failed:', e.message);
      return { data: [] as TemplateApiDTO[] };
    });

    const devices = devicesRes.data || [];
    const templates = templatesRes.data || [];

    // Extract unique stations from device telemetry
    const stationMap = new Map<string, StationDTO>();
    for (const d of devices) {
      if (d.stationId && !stationMap.has(d.stationId)) {
        stationMap.set(d.stationId, {
          stationId: d.stationId,
          stationName: d.stationName || `AP-${d.stationId}`,
        });
      }
    }
    const stations = Array.from(stationMap.values());

    console.log(
      `[HighlightService] Retrieved ${devices.length} devices, ${stations.length} AP gateways, and ${templates.length} templates.`
    );

    // 2. Attempt DB synchronization
    let persistedToDb = false;
    let dbError: string | undefined;

    try {
      // Find or default store
      let targetStore = storeId ? await db.store.findUnique({ where: { id: storeId } }) : null;
      if (!targetStore) {
        targetStore = await db.store.findFirst();
      }

      if (targetStore) {
        // Sync Gateways
        for (const st of stations) {
          await db.gateway.upsert({
            where: { hardwareId: st.stationId },
            update: {
              status: GatewayStatus.ONLINE,
              lastSeenAt: new Date(),
            },
            create: {
              storeId: targetStore.id,
              hardwareId: st.stationId,
              firmware: 'Highlight-AP-v5',
              status: GatewayStatus.ONLINE,
              lastSeenAt: new Date(),
              maxTagsPerSec: 50,
            },
          }).catch((err) => console.warn(`[HighlightService] Gateway upsert skipped for ${st.stationId}:`, err.message));
        }

        // Sync Tags
        for (const dev of devices) {
          const gw = dev.stationId
            ? await db.gateway.findUnique({ where: { hardwareId: dev.stationId } }).catch(() => null)
            : null;

          if (gw) {
            await db.tag.upsert({
              where: { hardwareId: dev.deviceNumber },
              update: {
                batteryPct: (dev.powerLevel ?? 5) * 20,
                rssi: dev.signal ? -Math.abs(dev.signal) : -65,
                reportedAt: new Date(),
              },
              create: {
                storeId: targetStore.id,
                gatewayId: gw.id,
                hardwareId: dev.deviceNumber,
                size: 'T290', // Default tag model
                batteryPct: (dev.powerLevel ?? 5) * 20,
                rssi: dev.signal ? -Math.abs(dev.signal) : -65,
                reportedAt: new Date(),
              },
            }).catch((err) => console.warn(`[HighlightService] Tag upsert skipped for ${dev.deviceNumber}:`, err.message));
          }
        }
        persistedToDb = true;
      }
    } catch (err: any) {
      dbError = err.message;
      console.warn('[HighlightService] Database persistence skipped/failed:', err.message);
    }

    return {
      success: true,
      syncedAt: new Date().toISOString(),
      organization: config.HIGHLIGHT_ORG_CODE,
      stations,
      devices,
      templates,
      persistedToDb,
      dbError,
    };
  }

  /**
   * Push a price update to Highlight cloud and bind to physical ESL tag
   */
  public static async pushPriceUpdate(params: {
    tagHardwareId: string;
    skuCode: string;
    prodName: string;
    priceMinor: number;
    mrpMinor: number;
    promoBadge?: string | null;
    templateId?: number;
    hindiName?: string;
  }): Promise<{
    success: boolean;
    syncLatencyMs: number;
    deviceNumber: string;
    templateId: number;
    price: number;
  }> {
    const client = getHighlightClient();
    const startTime = performance.now();
    const sellingPrice = params.priceMinor / 100;
    const mrp = params.mrpMinor / 100;

    // 1. Update or Create product in Highlight Catalog
    const productPayload = {
      uniqueId: params.skuCode,
      prodName: params.prodName,
      price: sellingPrice,
      priceUnit: '₹',
      commodityUnit: '1 unit',
      copyWriting: params.promoBadge || 'Regular Price',
      custFeature1: params.hindiName || '',
      custFeature2: `MRP: ₹${mrp.toFixed(0)}`,
      custFeature3: params.promoBadge ? `SAVE ₹${(mrp - sellingPrice).toFixed(0)}` : '',
    };

    try {
      await client.updateProduct(productPayload);
    } catch {
      // If product doesn't exist yet, create it
      await client.createProduct(productPayload);
    }

    // 2. Bind product to the physical tag and dispatch OTA screen update
    const targetTemplateId = params.templateId || 1213; // default 2.9" BWRY template
    await client.bindingPos({
      deviceNumber: params.tagHardwareId,
      templateId: targetTemplateId,
      uniqueIdList: [params.skuCode],
    });

    const latencyMs = Math.round(performance.now() - startTime);
    console.log(
      `[HighlightService] Successfully dispatched price ₹${sellingPrice} to tag ${params.tagHardwareId} in ${latencyMs}ms.`
    );

    return {
      success: true,
      syncLatencyMs: latencyMs,
      deviceNumber: params.tagHardwareId,
      templateId: targetTemplateId,
      price: sellingPrice,
    };
  }

  /**
   * Blink green LED or query physical device status
   */
  public static async locateDevice(deviceNumber: string): Promise<DeviceApiDTO> {
    const client = getHighlightClient();
    // Fire real over-the-air LED flash (Green, 30s)
    try {
      await client.eslFlash({
        deviceNumberList: [deviceNumber],
        lightColor: 2, // Green
        lightTime: 30, // 30 seconds
      });
    } catch {
      // Non-fatal if LED command queue is busy
    }
    const res = await client.searchDevice(deviceNumber);
    return res.data;
  }

  /**
   * Trigger over-the-air LED flash (Pick-to-Light) on physical ESL tag
   */
  public static async flashTagLed(params: {
    deviceNumber?: string;
    deviceNumberList?: string[];
    uniqueIdList?: string[];
    lightColor?: number;
    lightTime?: number;
  }): Promise<any> {
    const client = getHighlightClient();
    const deviceNumberList = params.deviceNumberList || (params.deviceNumber ? [params.deviceNumber] : undefined);
    return client.eslFlash({
      deviceNumberList,
      uniqueIdList: params.uniqueIdList,
      lightColor: params.lightColor ?? 2, // 1: red, 2: green, 3: blue, 4: yellow, 5: orange, 6: cyan, 7: purple, 8: white
      lightTime: params.lightTime ?? 30, // seconds
    });
  }

  /**
   * Stop over-the-air LED flash
   */
  public static async stopTagLed(params?: {
    deviceNumber?: string;
    deviceNumberList?: string[];
    uniqueIdList?: string[];
  }): Promise<any> {
    const client = getHighlightClient();
    const deviceNumberList = params?.deviceNumberList || (params?.deviceNumber ? [params.deviceNumber] : undefined);
    return client.eslFlashStop({
      deviceNumberList,
      uniqueIdList: params?.uniqueIdList,
    });
  }
}
