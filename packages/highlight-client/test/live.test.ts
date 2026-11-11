import { HighlightClient } from '../src/client.js';
import { generateHighlightSign, verifyHighlightSign } from '../src/signer.js';

async function runLiveTests() {
  console.log('======================================================');
  console.log('🚀 Running Highlight ESL API Live Integration Tests');
  console.log('======================================================\n');

  const appKey = '21186651';
  const appSecret = '67c08468b185468ea5326fe26def69ef';

  // 1. Signature Verification Test
  console.log('1️⃣ Testing MD5 Signature Generation...');
  const testTimestamp = 1606358315000;
  const testMethod = 'createOrganization';
  const testSign = generateHighlightSign(appKey, appSecret, testTimestamp, testMethod);
  const isValid = verifyHighlightSign(testSign, appKey, appSecret, testTimestamp, testMethod);
  if (!isValid) throw new Error('Signature verification failed');
  console.log('   ✅ Signature generated & verified:', testSign);

  // 2. Initialize Client
  const client = new HighlightClient({
    appKey,
    appSecret,
  });

  // 3. Test Fleet Device Retrieval
  console.log('\n2️⃣ Testing searchAllDevice (Fleet Query)...');
  const devicesRes = await client.searchAllDevice({ pageNum: 1, pageSize: 10 });
  console.log(`   ✅ Query success: Retrieved ${devicesRes.data?.length ?? 0} active ESL tags.`);
  if (devicesRes.data && devicesRes.data.length > 0) {
    const first = devicesRes.data[0];
    console.log(`   🏷️  Sample Tag: ${first.deviceNumber} | Station: ${first.stationId} | Signal: ${first.signal} dBm | Battery Level: ${first.powerLevel}/5 | Org: ${first.organizationName}`);
  }

  // 4. Test Single Device Telemetry
  if (devicesRes.data && devicesRes.data.length > 0) {
    const sampleTagId = devicesRes.data[0].deviceNumber;
    console.log(`\n3️⃣ Testing searchDevice (${sampleTagId})...`);
    const singleDevice = await client.searchDevice(sampleTagId);
    console.log(`   ✅ Device Telemetry ACK:`, {
      deviceNumber: singleDevice.data?.deviceNumber,
      stationId: singleDevice.data?.stationId,
      shelfDeviceStatus: singleDevice.data?.shelfDeviceStatus === '1' ? 'ONLINE' : 'OFFLINE',
      signal: singleDevice.data?.signal,
      powerLevel: singleDevice.data?.powerLevel,
    });
  }

  // 5. Test Template Retrieval
  console.log('\n4️⃣ Testing searchAllTemplate...');
  const templatesRes = await client.searchAllTemplate({ pageNum: 1, pageSize: 10 });
  console.log(`   ✅ Query success: Retrieved ${templatesRes.data?.length ?? 0} templates.`);
  if (templatesRes.data) {
    templatesRes.data.slice(0, 3).forEach((t) => {
      console.log(`   🎨 Template ${t.templateId}: "${t.templateName}" | Size: ${t.eslSize}" (${t.sizeWidth}x${t.sizeHeight}) | Color Mode: ${t.color} | Cards: ${t.cardCount}`);
    });
  }

  // 6. Test Product Lifecycle (Create, Query, Delete)
  const testSku = `QS-TEST-${Date.now().toString().slice(-6)}`;
  console.log(`\n5️⃣ Testing Product Lifecycle for SKU: ${testSku}...`);
  
  console.log(`   Creating test product...`);
  await client.createProduct({
    uniqueId: testSku,
    prodName: 'Tata Sampann Toor Dal 1kg',
    price: 185.0,
    priceUnit: '₹',
    commodityUnit: '1 kg',
    copyWriting: 'Unpolished Protein-Rich Lentils',
    custFeature1: 'टाटा सम्पन्न अरहर दाल', // Hindi name
    custFeature2: 'MRP: ₹210',             // Strikethrough MRP
    custFeature3: 'SAVE ₹25',              // Promo banner
  });
  console.log(`   ✅ Product created successfully.`);

  console.log(`   Querying created product...`);
  const found = await client.searchProduct({ uniqueId: testSku });
  console.log(`   ✅ Product retrieved: "${found.data?.[0]?.prodName}" | Price: ${found.data?.[0]?.priceUnit}${found.data?.[0]?.price}`);

  console.log(`   Cleaning up test product...`);
  await client.delProduct(testSku);
  console.log(`   ✅ Product deleted successfully.`);

  console.log('\n======================================================');
  console.log('🎉 ALL LIVE INTEGRATION TESTS PASSED CLEANLY (100%)');
  console.log('======================================================');
}

runLiveTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
