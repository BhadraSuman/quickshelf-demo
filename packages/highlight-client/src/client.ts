import { generateHighlightSign } from './signer.js';
import type {
  HighlightConfig,
  HighlightRawResponse,
  HighlightApiResponse,
  ProductDTO,
  ProductApiDTO,
  StationDTO,
  DeviceApiDTO,
  TemplateApiDTO,
  BindingPosDTO,
  UnboundPosDTO,
  ESLFlashDTO,
  ESLFlashStopDTO,
} from './types.js';

export class HighlightApiError extends Error {
  public readonly code: number;
  public readonly methodName: string;
  public readonly raw?: any;

  constructor(message: string, code: number, methodName: string, raw?: any) {
    super(`[HighlightApiError] ${methodName} (Code ${code}): ${message}`);
    this.name = 'HighlightApiError';
    this.code = code;
    this.methodName = methodName;
    this.raw = raw;
  }
}

let lastAssignedTimestamp = 0;
function getMonotonicTimestamp(): number {
  let now = Date.now();
  if (now <= lastAssignedTimestamp) {
    now = lastAssignedTimestamp + 1;
  }
  lastAssignedTimestamp = now;
  return now;
}

export class HighlightClient {
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly endpoint: string;
  private readonly lang: 'en_US' | 'zh-CN';
  private readonly timeoutMs: number;

  constructor(config?: Partial<HighlightConfig>) {
    this.appKey = config?.appKey || process.env.HIGHLIGHT_APP_KEY || '';
    this.appSecret = config?.appSecret || process.env.HIGHLIGHT_APP_SECRET || '';
    this.endpoint = config?.endpoint || process.env.HIGHLIGHT_ENDPOINT || 'http://www.electronicshelflabel.cn:8082/api/handle';
    this.lang = config?.lang || 'en_US';
    this.timeoutMs = config?.timeoutMs || 15000;

    if (!this.appKey || !this.appSecret) {
      console.warn('[HighlightClient] Warning: appKey or appSecret is missing. API calls will fail.');
    }
  }

  /**
   * Internal generic request dispatcher to Highlight single RPC endpoint with automatic retry on busy
   */
  public async request<T = any>(
    methodName: string,
    data: Record<string, any> = {},
    retryAttempt = 0
  ): Promise<HighlightApiResponse<T>> {
    const timestamp = getMonotonicTimestamp();
    const sign = generateHighlightSign(this.appKey, this.appSecret, timestamp, methodName);

    const body = {
      appKey: this.appKey,
      sign,
      timestamp,
      methodName,
      lang: this.lang,
      data,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new HighlightApiError(
          `HTTP ${response.status} ${response.statusText}`,
          response.status,
          methodName
        );
      }

      const raw: HighlightRawResponse<T> = await response.json();
      const code = Number(raw.code ?? raw.status ?? 500);
      const isSuccess = code === 200;

      if (!isSuccess) {
        // Highlight server returns "Current interface busy" or "operation failed!" during concurrency locks
        const isTransient =
          !isSuccess &&
          ((raw.msg &&
            (raw.msg.toLowerCase().includes('busy') ||
              raw.msg.toLowerCase().includes('later') ||
              raw.msg.toLowerCase().includes('operation failed'))) ||
            code === 500);

        if (isTransient && retryAttempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 600 * (retryAttempt + 1)));
          return this.request<T>(methodName, data, retryAttempt + 1);
        }
        throw new HighlightApiError(raw.msg || 'Unknown error', code, methodName, raw);
      }

      return {
        success: true,
        code,
        message: raw.msg || 'Success',
        data: raw.data,
        total: raw.total,
        raw,
      };
    } catch (err: any) {
      if (err instanceof HighlightApiError) throw err;
      if (err.name === 'AbortError') {
        throw new HighlightApiError(`Request timeout after ${this.timeoutMs}ms`, 408, methodName);
      }
      throw new HighlightApiError(err.message || 'Network exception', 500, methodName, err);
    } finally {
      clearTimeout(timeout);
    }
  }

  // =========================================================================
  // 4. Product Interface
  // =========================================================================

  /**
   * 4.1 Add single product <createProduct>
   */
  public async createProduct(product: ProductDTO): Promise<HighlightApiResponse<null>> {
    return this.request<null>('createProduct', product);
  }

  /**
   * 4.2 Query product <searchProduct>
   */
  public async searchProduct(query: { uniqueId?: string; prodName?: string }): Promise<HighlightApiResponse<ProductApiDTO[]>> {
    return this.request<ProductApiDTO[]>('searchProduct', {
      uniqueId: query.uniqueId || '',
      prodName: query.prodName || '',
    });
  }

  /**
   * 4.3 Modify product information <updateProduct>
   */
  public async updateProduct(product: ProductDTO): Promise<HighlightApiResponse<null>> {
    return this.request<null>('updateProduct', product);
  }

  /**
   * 4.4 Delete product <delProduct>
   */
  public async delProduct(uniqueId: string): Promise<HighlightApiResponse<null>> {
    return this.request<null>('delProduct', { uniqueId });
  }

  /**
   * 4.5 Query all products (paginated) <searchAllProduct>
   */
  public async searchAllProduct(params?: {
    uniqueId?: string;
    prodName?: string;
    pageNum?: number;
    pageSize?: number;
  }): Promise<HighlightApiResponse<ProductApiDTO[]>> {
    return this.request<ProductApiDTO[]>('searchAllProduct', {
      uniqueId: params?.uniqueId || '',
      prodName: params?.prodName || '',
      pageNum: params?.pageNum ?? 1,
      pageSize: params?.pageSize ?? 100,
    });
  }

  /**
   * 4.6 Batch Add products <batchCreateProduct>
   */
  public async batchCreateProduct(products: ProductDTO[]): Promise<HighlightApiResponse<null>> {
    return this.request<null>('batchCreateProduct', {
      productApiDTOList: products,
    });
  }

  /**
   * 4.7 Batch Modify products <batchUpdateProduct>
   */
  public async batchUpdateProduct(products: ProductDTO[]): Promise<HighlightApiResponse<null>> {
    return this.request<null>('batchUpdateProduct', {
      productApiDTOList: products,
    });
  }

  /**
   * 4.8 Batch Delete products <batchDelProduct>
   */
  public async batchDelProduct(uniqueIds: string[]): Promise<HighlightApiResponse<null>> {
    return this.request<null>('batchDelProduct', {
      productApiDTOList: uniqueIds.map((id) => ({ uniqueId: id })),
    });
  }

  // =========================================================================
  // 5. AP Gateway Interface
  // =========================================================================

  /**
   * 5.1 Add AP base station <createStation>
   */
  public async createStation(station: { stationId: string; stationName?: string }): Promise<HighlightApiResponse<null>> {
    return this.request<null>('createStation', station);
  }

  /**
   * 5.2 Query AP base station <searchStation>
   */
  public async searchStation(stationId: string): Promise<HighlightApiResponse<StationDTO>> {
    return this.request<StationDTO>('searchStation', { stationId });
  }

  /**
   * 5.3 Modify AP base station <updateStation>
   */
  public async updateStation(station: { stationId: string; stationName?: string }): Promise<HighlightApiResponse<null>> {
    return this.request<null>('updateStation', station);
  }

  /**
   * 5.4 Delete AP base station <delStation>
   */
  public async delStation(stationId: string): Promise<HighlightApiResponse<null>> {
    return this.request<null>('delStation', { stationId });
  }

  /**
   * 5.5 Query all AP base stations (paginated) <searchAllStation>
   */
  public async searchAllStation(params?: {
    stationId?: string;
    stationName?: string;
    pageNum?: number;
    pageSize?: number;
  }): Promise<HighlightApiResponse<StationDTO[]>> {
    return this.request<StationDTO[]>('searchAllStation', {
      stationId: params?.stationId || '',
      stationName: params?.stationName || '',
      pageNum: params?.pageNum ?? 1,
      pageSize: params?.pageSize ?? 50,
    });
  }

  // =========================================================================
  // 6. Device (ESL) Interface
  // =========================================================================

  /**
   * 6.1 Register new ESL device <createDevice>
   */
  public async createDevice(device: { deviceNumber: string; deviceName?: string }): Promise<HighlightApiResponse<null>> {
    return this.request<null>('createDevice', device);
  }

  /**
   * 6.2 Query single device telemetry <searchDevice>
   */
  public async searchDevice(deviceNumber: string): Promise<HighlightApiResponse<DeviceApiDTO>> {
    return this.request<DeviceApiDTO>('searchDevice', { deviceNumber });
  }

  /**
   * 6.3 Modify device name <updateDevice>
   */
  public async updateDevice(device: { deviceNumber: string; deviceName?: string }): Promise<HighlightApiResponse<null>> {
    return this.request<null>('updateDevice', device);
  }

  /**
   * 6.4 Delete device from network <delDevice>
   */
  public async delDevice(deviceNumber: string): Promise<HighlightApiResponse<null>> {
    return this.request<null>('delDevice', { deviceNumber });
  }

  /**
   * 6.5 Query all devices in fleet (paginated & filtered) <searchAllDevice>
   */
  public async searchAllDevice(params?: {
    deviceNumber?: string;
    deviceName?: string;
    sendStatus?: number;
    pageNum?: number;
    pageSize?: number;
  }): Promise<HighlightApiResponse<DeviceApiDTO[]>> {
    return this.request<DeviceApiDTO[]>('searchAllDevice', {
      deviceNumber: params?.deviceNumber || '',
      deviceName: params?.deviceName || '',
      sendStatus: params?.sendStatus !== undefined ? String(params.sendStatus) : '',
      pageNum: params?.pageNum ?? 1,
      pageSize: params?.pageSize ?? 100,
    });
  }

  // =========================================================================
  // 7. Template Interface
  // =========================================================================

  /**
   * 7.1 Query template by name <searchTemplate>
   */
  public async searchTemplate(templateName: string = ''): Promise<HighlightApiResponse<TemplateApiDTO[]>> {
    return this.request<TemplateApiDTO[]>('searchTemplate', { templateName });
  }

  /**
   * 7.2 Query all templates (paginated) <searchAllTemplate>
   */
  public async searchAllTemplate(params?: {
    templateName?: string;
    templateLayout?: number;
    pageNum?: number;
    pageSize?: number;
  }): Promise<HighlightApiResponse<TemplateApiDTO[]>> {
    return this.request<TemplateApiDTO[]>('searchAllTemplate', {
      templateName: params?.templateName || '',
      templateLayout: params?.templateLayout ?? '',
      pageNum: params?.pageNum ?? 1,
      pageSize: params?.pageSize ?? 100,
    });
  }

  // =========================================================================
  // 8. Product Display Binding Interface
  // =========================================================================

  /**
   * 8.1 Bind Product(s) to ESL Tag & Trigger OTA Display Update <bindingPos>
   */
  public async bindingPos(dto: BindingPosDTO): Promise<HighlightApiResponse<null>> {
    return this.request<null>('bindingPos', {
      stationId: dto.stationId || '',
      templateId: dto.templateId,
      deviceNumber: dto.deviceNumber,
      uniqueIdList: dto.uniqueIdList,
    });
  }

  /**
   * 8.2 Unbind Product(s) from ESL Tag <unboundPos>
   */
  public async unboundPos(dto: UnboundPosDTO): Promise<HighlightApiResponse<null>> {
    return this.request<null>('unboundPos', {
      stationId: dto.stationId || '',
      deviceNumber: dto.deviceNumber,
    });
  }

  // =========================================================================
  // 9. ESL LED Flash Interface (Pick-to-Light / Locate) - Highlight V5.0.25 §7.3 & §7.4
  // =========================================================================

  /**
   * 7.3 Trigger ESL LED Flash <eslFlash>
   */
  public async eslFlash(dto: ESLFlashDTO): Promise<HighlightApiResponse<Array<{ msg: string; deviceNumber: string }>>> {
    return this.request<Array<{ msg: string; deviceNumber: string }>>('eslFlash', {
      lightColor: dto.lightColor,
      lightTime: dto.lightTime,
      deviceNumberList: dto.deviceNumberList,
      uniqueIdList: dto.uniqueIdList,
    });
  }

  /**
   * 7.4 Stop ESL LED Flash <eslFlashStop>
   */
  public async eslFlashStop(dto?: ESLFlashStopDTO): Promise<HighlightApiResponse<null>> {
    return this.request<null>('eslFlashStop', {
      deviceNumberList: dto?.deviceNumberList,
      uniqueIdList: dto?.uniqueIdList,
    });
  }
}
