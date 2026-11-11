import React, { useState } from 'react';
import quickshelfIcon from '../assets/quickshelf-icon.png';
import {
  BookOpen,
  Search,
  CheckCircle2,
  HelpCircle,
  Radio,
  Tag as TagIcon,
  DollarSign,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Battery,
  Wifi,
  ChevronDown,
  ChevronRight,
  Info,
  Link2,
  Unlink,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';
import type { HighlightDevice } from './HighlightFleetView.js';

interface DocumentationViewProps {
  theme?: 'dark' | 'light';
  highlightDevices?: HighlightDevice[];
}

interface DocSection {
  id: string;
  title: string;
  icon: any;
  summary: string;
  content: React.ReactNode;
}

export function DocumentationView({ highlightDevices = [] }: DocumentationViewProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [diagnosticTagNumber, setDiagnosticTagNumber] = useState<string>(
    highlightDevices[0]?.deviceNumber || '8003152970'
  );

  // Enterprise SaaS Light Palette
  const c = {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceSubtle: '#f1f5f9',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primarySubtle: '#eff6ff',
    success: '#059669',
    successSubtle: '#ecfdf5',
    warning: '#d97706',
    warningSubtle: '#fffbeb',
    error: '#dc2626',
    errorSubtle: '#fef2f2',
  };

  const selectedDiagnosticDevice =
    highlightDevices.find((d) => d.deviceNumber === diagnosticTagNumber) ||
    highlightDevices[0] ||
    ({
      deviceNumber: '8003152970',
      stationId: 'E43819636067',
      powerLevel: 5,
      signal: 71,
      templateName: 'Bada wala kalakand',
      skuCode: 'SKU-KLK-750',
      skuName: 'Bada Wala Kalakand 500g',
    } as HighlightDevice);

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'System Architecture & Sync',
      icon: BookOpen,
      summary: 'How QuickShelf synchronizes retail prices between POS ERP, Cloud, and Physical E-Paper displays.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
              Enterprise ESL Synchronization Architecture
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.textSecondary, lineHeight: 1.6 }}>
              QuickShelf serves as the enterprise bridge connecting retail Point-of-Sale (POS) engines to physical shelf labels deployed throughout store aisles. The system guarantees zero price divergence: the shelf display is cryptographically verified to match checkout scanners.
            </p>
          </div>

          {/* Architecture Pipeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.primary, fontWeight: 600, fontSize: '12px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c.primary, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>1</span>
                <span style={{ whiteSpace: 'nowrap' }}>POS Ingestion</span>
              </div>
              <h4 style={{ margin: '8px 0 3px', fontSize: '13px', color: c.text, fontWeight: 700 }}>Price Update Ingested</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                POS or ERP systems (SAP, Posist, Shopify, Oracle) push updates via signed REST webhooks to <code>/webhooks/pos</code>.
              </p>
            </div>

            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.warning, fontWeight: 600, fontSize: '12px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c.warning, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>2</span>
                <span style={{ whiteSpace: 'nowrap' }}>Compliance Engine</span>
              </div>
              <h4 style={{ margin: '8px 0 3px', fontSize: '13px', color: c.text, fontWeight: 700 }}>Guardrail Verified</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                The PRC-04 guardrail engine checks Selling Price &le; MRP, preventing unlawful overcharging under consumer law.
              </p>
            </div>

            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.primary, fontWeight: 600, fontSize: '12px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c.primary, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>3</span>
                <span style={{ whiteSpace: 'nowrap' }}>Highlight Cloud RPC</span>
              </div>
              <h4 style={{ margin: '8px 0 3px', fontSize: '13px', color: c.text, fontWeight: 700 }}>OTA Queue Dispatch</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                Payloads are MD5-signed and dispatched via <code>createProduct</code> and <code>bindingPos</code> to Highlight's cloud.
              </p>
            </div>

            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.success, fontWeight: 600, fontSize: '12px' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c.success, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>4</span>
                <span style={{ whiteSpace: 'nowrap' }}>Sub-GHz Broadcast</span>
              </div>
              <h4 style={{ margin: '8px 0 3px', fontSize: '13px', color: c.text, fontWeight: 700 }}>E-Paper Refresh</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                Base station (AP E43819636067) broadcasts the radio frame. The tag's e-paper refreshes within ~800 milliseconds.
              </p>
            </div>
          </div>

          {/* Sync Status Callout */}
          <div style={{ backgroundColor: c.primarySubtle, border: '1px solid #bfdbfe', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={15} color={c.primary} />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                Understanding Fleet Status States
              </h4>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#1e3a8a', lineHeight: 1.5 }}>
              <strong>Converged (All Synced):</strong> Every active physical tag in the store has acknowledged and displayed the latest price.<br />
              <strong>Diverged (Syncing):</strong> An in-flight price update was issued. The base station is currently transmitting the wireless packet during the tag's radio polling cycle.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'pairing-sop',
      title: 'Tag Pairing & Unbinding SOP',
      icon: Link2,
      summary: 'Standard Operating Procedure for pairing new physical labels to items and releasing them back to inventory.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
              Store Associate Standard Operating Procedure (SOP)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.textSecondary, lineHeight: 1.6 }}>
              Follow these exact steps when attaching a physical ESL tag to a shelf fixture or reassigning an existing label.
            </p>
          </div>

          {/* Step-by-Step Pairing Guide */}
          <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Link2 size={16} color={c.primary} />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                Workflow 1: Pairing an Unbound Tag with a Product
              </h4>
            </div>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: c.textSecondary, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <strong>Locate the Physical Tag</strong>: Take the unassigned label and read the 10-digit device barcode on the back (e.g. <code>8003152970</code>).
              </li>
              <li>
                <strong>Open the Pairing Studio</strong>: In the dashboard, navigate to <strong>Highlight IoT Fleet</strong> and click <strong>+ Pair Physical Tag</strong> or click <strong>Pair SKU</strong> next to any standby device.
              </li>
              <li>
                <strong>Select or Scan Device</strong>: Confirm the device number matches the physical label in your hand. The dashboard will show the tag's battery and signal strength.
              </li>
              <li>
                <strong>Enter Product Details</strong>: Fill in the SKU Code, English Title, Regional/Hindi Name, Selling Price, and MRP. You can also pick from the sample preset buttons to fill in 1 click.
              </li>
              <li>
                <strong>Review Live Preview</strong>: Check the simulated e-paper screen on the right to verify that the price, discount badge, and layout look crisp and legible.
              </li>
              <li>
                <strong>Dispatch OTA Update</strong>: Click <strong>Pair &amp; Transmit OTA Update</strong>. Base station <code>E43819636067</code> will transmit the radio signal. The physical e-paper display will rewrite in a few seconds.
              </li>
              <li>
                <strong>Clip to Shelf Rail</strong>: Mount the label into the shelf channel or clear acrylic holder facing the customer.
              </li>
            </ol>
          </div>

          {/* Step-by-Step Unbinding Guide */}
          <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Unlink size={16} color={c.error} />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                Workflow 2: Unbinding a Tag (Stockout / Item Discontinued)
              </h4>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
              When a product is permanently removed from the shelf or fixtures are being rearranged, always unbind the tag to prevent customer confusion:
            </p>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: c.textSecondary, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                Go to the <strong>Highlight IoT Fleet</strong> inventory table.
              </li>
              <li>
                Find the label row and click the red <strong>Unbind</strong> button.
              </li>
              <li>
                Confirm the unbind dialog.
              </li>
              <li>
                The tag receives an unbinding frame from the AP station. The screen resets to standby and the device returns to the available inventory pool for reuse.
              </li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'price-updates',
      title: 'Pricing & Legal Metrology Guardrails',
      icon: DollarSign,
      summary: 'Rules for single price updates, automated MRP guardrails (PRC-04), and promotional flash sales.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
              Dynamic Pricing Guide &amp; Compliance Enforcement
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.textSecondary, lineHeight: 1.6 }}>
              QuickShelf allows instant price responsiveness while providing automated safeguards against human error and legal violations.
            </p>
          </div>

          {/* Legal Compliance Alert */}
          <div style={{ backgroundColor: c.warningSubtle, border: '1px solid #fde68a', borderRadius: '6px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color={c.warning} />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                PRC-04 Compliance Guardrail (Legal Metrology Act)
              </h4>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#78350f', lineHeight: 1.5 }}>
              Under Indian retail consumer laws (The Legal Metrology Packaged Commodities Rules), retail establishments are strictly prohibited from selling packaged commodities at a price higher than the Maximum Retail Price (MRP) printed by the manufacturer. QuickShelf enforces this rule at the API level: any price update where <code>Selling Price &gt; MRP</code> is automatically blocked with an alert before transmission.
            </p>
          </div>

          {/* Feature Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: c.text, fontWeight: 700 }}>Single Tag Price Push</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                Click <strong>Update Price</strong> on any shelf label to adjust its price, modify promo text (e.g. <em>Special Offer</em> or <em>Save ₹35</em>), and dispatch immediately over the air.
              </p>
            </div>

            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: c.text, fontWeight: 700 }}>Automated Savings Calculation</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                Whenever an MRP is provided alongside the selling price, QuickShelf automatically computes the discount percentage and savings pill (e.g. <code>SAVE ₹40 (14% OFF)</code>) and renders it on the tag.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'hardware',
      title: 'Hardware Sizing & Battery Manual',
      icon: Cpu,
      summary: 'Specifications for 7.5" HS750-M, 4.2", 2.9", 1.8" labels, and CR2450 coin-cell battery replacement.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
              Hardware Sizing &amp; Display Specifications
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.textSecondary, lineHeight: 1.6 }}>
              QuickShelf supports the complete range of Highlight bi-stable electrophoretic e-paper displays. Because e-paper displays reflect ambient light and consume zero energy when displaying static content, battery life is measured in years.
            </p>
          </div>

          {/* Hardware Table */}
          <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: c.surfaceSubtle, borderBottom: `1px solid ${c.border}`, color: c.textMuted }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>MODEL</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>SIZE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>RESOLUTION</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>COLOR MODE</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>TYPICAL PLACEMENT</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>TEMPLATE</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${c.border}`, backgroundColor: '#eff6ff' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: c.primary }}>HS750-M (Sample)</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text }}>7.5 Inch</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>800 &times; 480 px</td>
                  <td style={{ padding: '10px 14px' }}>B/W/R/Y (5-Color)</td>
                  <td style={{ padding: '10px 14px', color: c.textSecondary }}>Bakery End-Caps, Sweet Boxes, Electronics</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: c.primary, fontWeight: 700 }}>1256 (Kalakand)</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text }}>HS580</td>
                  <td style={{ padding: '10px 14px' }}>5.8 Inch</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>648 &times; 480 px</td>
                  <td style={{ padding: '10px 14px' }}>B/W/R/Y (5-Color)</td>
                  <td style={{ padding: '10px 14px', color: c.textSecondary }}>Fruit &amp; Vegetable Crates, Aisle Headers</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: c.primary }}>1212</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text }}>HS420</td>
                  <td style={{ padding: '10px 14px' }}>4.2 Inch</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>400 &times; 300 px</td>
                  <td style={{ padding: '10px 14px' }}>B/W/R/Y (5-Color)</td>
                  <td style={{ padding: '10px 14px', color: c.textSecondary }}>Apparel racks, Wine/Liquor Shelves</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: c.primary }}>1217</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text }}>HS290 (Standard)</td>
                  <td style={{ padding: '10px 14px' }}>2.9 Inch</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>296 &times; 128 px</td>
                  <td style={{ padding: '10px 14px' }}>B/W/R/Y (5-Color)</td>
                  <td style={{ padding: '10px 14px', color: c.textSecondary }}>Standard FMCG Grocery Shelf Channels</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: c.primary }}>1213</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text }}>HS213</td>
                  <td style={{ padding: '10px 14px' }}>2.13 Inch</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>250 &times; 122 px</td>
                  <td style={{ padding: '10px 14px' }}>B/W/R/Y (5-Color)</td>
                  <td style={{ padding: '10px 14px', color: c.textSecondary }}>High-Density Small Fixtures, Confectionery</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: c.primary }}>1215</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: c.text }}>HS180</td>
                  <td style={{ padding: '10px 14px' }}>1.8 Inch</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>224 &times; 168 px</td>
                  <td style={{ padding: '10px 14px' }}>B/W/R/Y (5-Color)</td>
                  <td style={{ padding: '10px 14px', color: c.textSecondary }}>Cosmetics, Spices, Pharmacy Vials</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: c.primary }}>1214</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Battery Maintenance */}
          <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.success, fontWeight: 700, marginBottom: '6px' }}>
              <Battery size={16} />
              <span>Battery Replacement Guide (CR2450 / CR2430)</span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
              Highlight labels are powered by user-replaceable standard lithium button cells. When a label reports battery level <strong>1/5 (20%)</strong> in the dashboard:
            </p>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: c.textSecondary, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Unclip the tag from the shelf rail using the release key or gentle downward pressure.</li>
              <li>Slide or unscrew the rear battery door on the back casing.</li>
              <li>Remove the depleted CR2450 coin cells and insert new batteries with the <strong>positive (+) side facing upward</strong>.</li>
              <li>Re-fasten the battery hatch. The tag will transmit a boot beacon and re-register with AP <code>E43819636067</code>.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'ap-deployment',
      title: 'AP Base Station Network & PoE',
      icon: Radio,
      summary: 'Mounting specifications, PoE Ethernet power, and Sub-GHz radio propagation for base station E43819636067.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
              Base Station (AP) Deployment &amp; Radio Engineering
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.textSecondary, lineHeight: 1.6 }}>
              The Highlight AP base station (ID: <code>E43819636067</code>) is the wireless gateway bridging QuickShelf's cloud commands to your physical electronic shelf labels.
            </p>
          </div>

          {/* Deployment Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: c.text, fontWeight: 700 }}>Power-over-Ethernet (PoE)</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                Connect the AP using a standard CAT5e/CAT6 Ethernet cable to an <strong>802.3af PoE switch</strong> or 48V PoE injector. Power consumption is low (&lt;5W).
              </p>
            </div>

            <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '6px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: c.text, fontWeight: 700 }}>Sub-GHz vs 2.4 GHz Wi-Fi</h4>
              <p style={{ margin: 0, fontSize: '12px', color: c.textSecondary, lineHeight: 1.5 }}>
                Operates on the 865 - 868 MHz ISM band in India. Unlike congested 2.4 GHz Wi-Fi, Sub-GHz frequencies penetrate retail metal racks and reach tags up to 50 meters away.
              </p>
            </div>
          </div>

          {/* Mounting Guidelines */}
          <div style={{ backgroundColor: c.surfaceSubtle, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: c.text, fontWeight: 700 }}>
              Optimal Physical Mounting Rules:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: c.textSecondary, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong>Mount on Ceiling (3.5m – 4.5m Height)</strong>: Ceiling placement provides clear line-of-sight across multiple retail aisles and avoids obstruction by store crowds.
              </li>
              <li>
                <strong>Keep Distance from Metal HVAC Ducts</strong>: Ensure at least 1 meter of clearance from heavy metal ventilation conduits to prevent RF dead-zones.
              </li>
              <li>
                <strong>Capacity Planning</strong>: One base station can reliably control up to <strong>3,000 active shelf labels</strong> covering approximately 2,500 square meters.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting & Live Diagnostics',
      icon: HelpCircle,
      summary: 'Interactive hardware diagnostic tool, signal strength reference, and FAQ resolutions.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: c.text }}>
              Interactive Hardware Diagnostics &amp; Troubleshooting Runbook
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.textSecondary, lineHeight: 1.6 }}>
              Select any of your physical tags below to run an instant connection and health diagnosis.
            </p>
          </div>

          {/* Interactive Hardware Health Checker */}
          <div style={{ backgroundColor: c.surface, border: `2px solid ${c.primary}`, borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={16} color={c.primary} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: c.text }}>
                  Live Tag Health Diagnostic
                </h4>
              </div>

              {/* Tag Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: c.textMuted, fontWeight: 600 }}>Select Tag:</span>
                <select
                  value={diagnosticTagNumber}
                  onChange={(e) => setDiagnosticTagNumber(e.target.value)}
                  style={{
                    backgroundColor: c.surfaceSubtle,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                  }}
                >
                  {highlightDevices.map((d) => (
                    <option key={d.deviceNumber} value={d.deviceNumber}>
                      {d.deviceNumber} {d.deviceNumber === '8003152970' ? '(7.5" Sample)' : ''}
                    </option>
                  ))}
                  {highlightDevices.length === 0 && (
                    <option value="8003152970">8003152970 (7.5" Sample)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Diagnostic Results Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: c.surfaceSubtle, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: '11px', color: c.textMuted, fontWeight: 600 }}>RF SIGNAL (RSSI)</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: c.text, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wifi size={16} color={c.success} />
                  <span>{selectedDiagnosticDevice.signal ? `${selectedDiagnosticDevice.signal} dBm` : '-71 dBm'}</span>
                </div>
                <div style={{ fontSize: '11px', color: c.success, marginTop: '2px', fontWeight: 600 }}>
                  Excellent Signal Quality
                </div>
              </div>

              <div style={{ backgroundColor: c.surfaceSubtle, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: '11px', color: c.textMuted, fontWeight: 600 }}>BATTERY HEALTH</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: c.text, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Battery size={16} color={c.success} />
                  <span>100% ({selectedDiagnosticDevice.powerLevel ?? 5}/5)</span>
                </div>
                <div style={{ fontSize: '11px', color: c.success, marginTop: '2px', fontWeight: 600 }}>
                  Normal Operating Voltage
                </div>
              </div>

              <div style={{ backgroundColor: c.surfaceSubtle, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: '11px', color: c.textMuted, fontWeight: 600 }}>BASE STATION LINK</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: c.text, marginTop: '4px', fontFamily: 'monospace' }}>
                  {selectedDiagnosticDevice.stationId || 'E43819636067'}
                </div>
                <div style={{ fontSize: '11px', color: c.primary, marginTop: '2px', fontWeight: 600 }}>
                  Sub-GHz Link Verified
                </div>
              </div>

              <div style={{ backgroundColor: c.surfaceSubtle, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: '11px', color: c.textMuted, fontWeight: 600 }}>BOUND TEMPLATE</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: c.text, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedDiagnosticDevice.templateName || '1256 (Kalakand)'}
                </div>
                <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '2px' }}>
                  Resolution 800&times;480
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: c.successSubtle, border: '1px solid #a7f3d0', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: c.success, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span><strong>Hardware Operational:</strong> Physical tag {selectedDiagnosticDevice.deviceNumber} is healthy and receiving OTA commands from AP {selectedDiagnosticDevice.stationId || 'E43819636067'}.</span>
            </div>
          </div>

          {/* Accordion FAQs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: '8px 0 4px', fontSize: '14px', fontWeight: 700, color: c.text }}>
              Common Questions &amp; Resolutions
            </h4>
            {[
              {
                q: 'Why does the e-paper display take 3 to 8 seconds to rewrite?',
                a: 'Unlike LCD screens that emit light, e-paper displays rely on physical micro-capsules containing charged pigment particles (Black, White, Red, and Yellow). When a new price is received, the display controller applies electrical voltage pulses across multiple refresh cycles to physically reposition the pigments. This bi-stable physical process takes 3-8 seconds, but once drawn, the screen retains the image indefinitely with ZERO electricity.',
              },
              {
                q: 'Why did my physical tag not flash its LED when clicking Locate?',
                a: 'The public Highlight Cloud API (V5.0.17) does not expose an open remote LED flash endpoint. However, the tag\'s LED beacon flashes automatically whenever an Over-The-Air price update (bindingPos) is transmitted by base station E43819636067.',
              },
              {
                q: 'What does RSSI -71 dBm indicate?',
                a: 'RSSI (Received Signal Strength Indicator) measures the Sub-GHz radio link quality:\n• > -65 dBm: Excellent signal (immediate updates)\n• -65 to -75 dBm: Good signal (recommended retail operating range)\n• -75 to -85 dBm: Fair signal (occasional retransmissions)\n• < -85 dBm: Weak signal (reposition AP or check for metal shelving obstruction)',
              },
              {
                q: 'What should I do if a price update shows "Product doesn\'t exist"?',
                a: 'Highlight\'s cloud architecture requires an item to be present in their cloud product catalog before associating it with a tag. QuickShelf\'s Hardware Pairing Studio and OTA Price Push tools automatically upsert the SKU first, preventing this error.',
              },
              {
                q: 'Can electronic shelf labels be used in refrigerated dairy or freezer aisles?',
                a: 'Yes. Highlight standard tags operate from 0°C to 50°C. For sub-zero walk-in freezers (down to -20°C), specialized freezer tags equipped with low-temperature electrolyte button cells are used.',
              },
            ].map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: c.surfaceSubtle,
                    border: `1px solid ${c.border}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      color: c.text,
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{faq.q}</span>
                    {isExpanded ? <ChevronDown size={15} color={c.textMuted} /> : <ChevronRight size={15} color={c.textMuted} />}
                  </button>
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0 14px 12px',
                        fontSize: '12px',
                        color: c.textSecondary,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                        borderTop: `1px solid ${c.border}`,
                        paddingTop: '8px',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q);
  });

  const activeDoc = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={quickshelfIcon} alt="QuickShelf" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>
              Operations Guide &amp; Customer Documentation
            </h2>
          </div>
          <p style={{ margin: '2px 0 0', color: c.textMuted, fontSize: '13px' }}>
            Reference manual, standard operating procedures (SOP), and hardware guides for retail store associates and IT managers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px' }}>
          <Search size={14} color={c.textMuted} />
          <input
            type="text"
            placeholder="Search SOPs, hardware specs, errors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: c.surface,
              border: `1px solid ${c.border}`,
              color: c.text,
              fontSize: '12px',
              padding: '7px 10px',
              borderRadius: '6px',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Left Nav */}
        <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', padding: '6px 10px', letterSpacing: '0.5px' }}>
            Documentation Topics
          </span>
          {filteredSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? c.surfaceSubtle : 'transparent',
                  color: isActive ? c.primary : c.textSecondary,
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} color={isActive ? c.primary : c.textMuted} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{sec.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content */}
        <div style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '20px' }}>
          {activeDoc.content}
        </div>
      </div>
    </div>
  );
}
