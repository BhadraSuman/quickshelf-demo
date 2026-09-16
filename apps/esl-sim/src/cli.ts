#!/usr/bin/env node
import { Command } from 'commander';
import { VirtualGateway } from './gateway.js';
import { VirtualTag } from './tag.js';

const program = new Command();

program
  .name('esl-sim')
  .description('Virtual Electronic Shelf Label (ESL) Fleet Simulator')
  .version('0.1.0')
  .option('-g, --gateway <id>', 'Gateway ID', 'gw-blr-01')
  .option('-t, --tags <count>', 'Number of simulated tags', '5')
  .option('-u, --hub <url>', 'Gateway Hub WebSocket URL', 'ws://localhost:8080')
  .option('--heartbeat <ms>', 'Heartbeat interval in milliseconds', '15000')
  .option('--latency <ms>', 'Simulated radio latency in milliseconds', '20')
  .action((options) => {
    const tagCount = parseInt(options.tags, 10);
    const heartbeatMs = parseInt(options.heartbeat, 10);
    const latencyMs = parseInt(options.latency, 10);

    console.log(`\n🏷️  Starting ESL Simulator`);
    console.log(`========================================`);
    console.log(`Gateway ID:    ${options.gateway}`);
    console.log(`Tag Count:     ${tagCount}`);
    console.log(`Hub URL:       ${options.hub}`);
    console.log(`Heartbeat:     ${heartbeatMs}ms`);
    console.log(`Radio Latency: ${latencyMs}ms`);
    console.log(`========================================\n`);

    const gateway = new VirtualGateway({
      gatewayId: options.gateway,
      hubUrl: options.hub,
      heartbeatMs,
      simulatedLatencyMs: latencyMs,
    });

    for (let i = 1; i <= tagCount; i++) {
      const tagId = `tag-${String(i).padStart(3, '0')}`;
      const tag = new VirtualTag({
        tagId,
        version: 0,
        battery: 90 + Math.floor(Math.random() * 10),
        rssi: -60 - Math.floor(Math.random() * 15),
      });
      gateway.registerTag(tag);
    }

    gateway.start();

    process.on('SIGINT', () => {
      console.log('\nShutting down simulator...');
      gateway.stop();
      process.exit(0);
    });
  });

program.parse(process.argv);
