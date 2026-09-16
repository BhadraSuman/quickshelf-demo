import type {
  AckFrame,
  NackFrame,
  NackReason,
  TagRenderPayload,
  HelloTagInventory,
} from '@quickshelf/esl-protocol';

export interface VirtualTagOptions {
  tagId: string;
  version?: number;
  hash?: string;
  battery?: number;
  rssi?: number;
}

export type RenderResult =
  | { success: true; ack: Omit<AckFrame, 'type'> }
  | { success: false; nack: Omit<NackFrame, 'type'> };

export class VirtualTag {
  public readonly tagId: string;
  public version: number;
  public hash: string;
  public battery: number;
  public rssi: number;

  // Chaos injection switches
  public unreachable: boolean = false;
  public forceRenderFail: boolean = false;

  constructor(options: VirtualTagOptions) {
    this.tagId = options.tagId;
    this.version = options.version ?? 0;
    this.hash = options.hash ?? '0000000000000000000000000000000000000000000000000000000000000000';
    this.battery = options.battery ?? 95;
    this.rssi = options.rssi ?? -65;
  }

  public toInventory(): HelloTagInventory {
    return {
      tagId: this.tagId,
      version: this.version,
      hash: this.hash,
      battery: Math.round(this.battery),
    };
  }

  /**
   * Simulates applying a render update over BLE.
   */
  public async applyRender(
    commandId: string,
    targetVersion: number,
    targetHash: string,
    _payload: TagRenderPayload,
    simulatedLatencyMs: number = 20
  ): Promise<RenderResult> {
    if (simulatedLatencyMs > 0) {
      await new Promise((res) => setTimeout(res, simulatedLatencyMs));
    }

    // 1. Tag Reachability check
    if (this.unreachable) {
      return {
        success: false,
        nack: {
          commandId,
          tagId: this.tagId,
          reason: 'TAG_UNREACHABLE',
        },
      };
    }

    // 2. Monotonic Version Check (Hard Rule: version must strictly increase)
    if (targetVersion <= this.version) {
      return {
        success: false,
        nack: {
          commandId,
          tagId: this.tagId,
          reason: 'STALE_VERSION',
        },
      };
    }

    // 3. Battery Threshold Check (< 15% cannot safely power e-ink refresh)
    if (this.battery < 15) {
      return {
        success: false,
        nack: {
          commandId,
          tagId: this.tagId,
          reason: 'LOW_BATTERY',
        },
      };
    }

    // 4. Simulated Driver / CRC failure
    if (this.forceRenderFail) {
      return {
        success: false,
        nack: {
          commandId,
          tagId: this.tagId,
          reason: 'RENDER_FAIL',
        },
      };
    }

    // Success: State transitions and slight battery drain from e-ink bi-stable refresh
    this.version = targetVersion;
    this.hash = targetHash;
    this.battery = Math.max(0, this.battery - 0.05);

    return {
      success: true,
      ack: {
        commandId,
        tagId: this.tagId,
        appliedVersion: this.version,
        hash: this.hash,
        battery: Math.round(this.battery),
        rssi: this.rssi,
      },
    };
  }
}
