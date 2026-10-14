/**
 * SmartBin - Software Sensor Simulator (Standalone CLI & Runner)
 * Simulates HC-SR04 ultrasonic sensor readings transmitting to Express backend via HTTP POST.
 *
 * Usage:
 *   node simulation/sensorSimulator.js [options]
 *
 * Options:
 *   --scenario <A|B|C|D|E|F|H>   Run a specific test scenario
 *   --bin <bin_id>               Target a specific bin (default: BIN-001)
 *   --url <backend_url>          Backend API URL (default: http://localhost:5000/api/bins/data)
 *   --interval <seconds>         Transmission interval (default: 3)
 *   --once                       Send a single reading and exit
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Default options
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}
const hasFlag = flag => args.includes(flag);

const BACKEND_URL = getArg('--url', 'http://localhost:5000/api/bins/data');
const TARGET_BIN = getArg('--bin', 'BIN-001');
const SCENARIO = getArg('--scenario', hasFlag('--auto') ? 'H' : 'H').toUpperCase();
const INTERVAL = Math.max(1, parseInt(getArg('--interval', '3'), 10));
const SEND_ONCE = hasFlag('--once');

// ANSI Color helper
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const SCENARIO_DEFS = {
  A: { name: 'Scenario A: Empty Bin', distance: 40.0, valid: true, desc: 'Distance 40 cm -> 0% fill -> LOW' },
  B: { name: 'Scenario B: Half-Filled Bin', distance: 22.5, valid: true, desc: 'Distance 22.5 cm -> 50% fill -> MEDIUM' },
  C: { name: 'Scenario C: Nearly Full Bin', distance: 8.5, valid: true, desc: 'Distance 8.5 cm -> 90% fill -> HIGH (Collection Needed)' },
  D: { name: 'Scenario D: Completely Full Bin', distance: 5.0, valid: true, desc: 'Distance 5.0 cm -> 100% fill -> FULL (Urgent Collection)' },
  E: { name: 'Scenario E: Sensor Error', distance: -1.0, valid: false, desc: 'Timeout/Invalid pulse -> SENSOR ERROR' },
  F: { name: 'Scenario F: Wi-Fi Disconnection', distance: null, valid: false, desc: 'Simulate connection failure (packets dropped)' },
  H: { name: 'Scenario H: Multi-Bin Autonomous Cycle', multi: true, desc: 'Continuously updates 6 municipal bins with realistic dynamics' }
};

const BINS = [
  { id: 'BIN-001', location: 'Main Campus Gate', currentFill: 25.0 },
  { id: 'BIN-002', location: 'Library Block', currentFill: 54.0 },
  { id: 'BIN-003', location: 'Bus Stop', currentFill: 88.0 },
  { id: 'BIN-004', location: 'Central Market', currentFill: 97.0 },
  { id: 'BIN-005', location: 'Public Park', currentFill: 15.0 },
  { id: 'BIN-006', location: 'Municipal Office', currentFill: 42.0 }
];

function sendReading(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL);
    const data = JSON.stringify(payload);

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 4000
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out to backend.'));
    });

    req.write(data);
    req.end();
  });
}

function fillToDistance(fill, emptyDist = 40.0, fullDist = 5.0) {
  const usable = emptyDist - fullDist;
  return emptyDist - (fill / 100) * usable;
}

async function runScenario(scenarioKey) {
  const scenario = SCENARIO_DEFS[scenarioKey];
  if (!scenario) {
    console.error(`Invalid scenario: ${scenarioKey}. Available: A, B, C, D, E, F, H`);
    process.exit(1);
  }

  console.log(`\n${colors.bold}${colors.cyan}==============================================================${colors.reset}`);
  console.log(`${colors.bold}  SMARTBIN VIRTUAL SENSOR SIMULATOR${colors.reset}`);
  console.log(`  Target Backend: ${colors.yellow}${BACKEND_URL}${colors.reset}`);
  console.log(`  Running: ${colors.bold}${scenario.name}${colors.reset}`);
  console.log(`  Details: ${colors.gray}${scenario.desc}${colors.reset}`);
  console.log(`${colors.cyan}==============================================================${colors.reset}\n`);

  if (scenarioKey === 'F') {
    console.log(`${colors.red}[!] SIMULATING WI-FI DISCONNECTION on ${TARGET_BIN}${colors.reset}`);
    console.log(`${colors.gray}Packet dropped intentionally. No HTTP POST will be sent.${colors.reset}`);
    console.log(`${colors.gray}The backend StaleDeviceMonitor will flag the bin as OFFLINE once the timeout expires.${colors.reset}\n`);
    return;
  }

  if (scenarioKey !== 'H') {
    // Single scenario execution
    const payload = {
      bin_id: TARGET_BIN,
      distance_cm: scenario.distance,
      sensor_valid: scenario.valid,
      source: 'simulation'
    };

    try {
      console.log(`[TX] Sending simulated reading:`, JSON.stringify(payload));
      const res = await sendReading(payload);
      const bin = res.data?.data?.bin;

      let color = colors.green;
      if (bin?.status === 'FULL') color = colors.red;
      else if (bin?.status === 'HIGH') color = colors.yellow;
      else if (bin?.status === 'MEDIUM') color = colors.blue;
      else if (bin?.status === 'SENSOR ERROR') color = colors.purple;

      console.log(`${colors.green}[RX 200 OK]${colors.reset} Status: ${color}${colors.bold}${bin?.status}${colors.reset} | Fill: ${bin?.fill_percentage}% | Distance: ${bin?.distance_cm} cm`);
      console.log(`Action: ${colors.gray}${bin?.action}${colors.reset}\n`);
    } catch (err) {
      console.error(`${colors.red}[RX ERROR] Failed to connect to backend:${colors.reset}`, err.message);
      console.log(`${colors.yellow}Tip: Make sure the SmartBin backend is running on ${BACKEND_URL}${colors.reset}\n`);
    }
    return;
  }

  // Multi-bin autonomous simulation loop
  let tick = 0;
  async function loop() {
    tick++;
    console.log(`${colors.gray}[Cycle #${tick} - ${new Date().toLocaleTimeString()}] Transmitting multi-bin telemetry...${colors.reset}`);

    for (const bin of BINS) {
      // Simulate realistic fluctuation and waste deposit
      const deposit = Math.round((Math.random() * 2.5 + 0.2) * 10) / 10;
      if (bin.currentFill >= 98) {
        bin.currentFill = Math.round((Math.random() * 8 + 3) * 10) / 10; // Emptied
        console.log(`  ${colors.purple}[COLLECTION] ${bin.id} was emptied by municipal crew.${colors.reset}`);
      } else {
        bin.currentFill = Math.min(100, bin.currentFill + deposit);
      }

      const distance = Math.round((fillToDistance(bin.currentFill) + (Math.random() - 0.5) * 0.2) * 10) / 10;

      const payload = {
        bin_id: bin.id,
        distance_cm: distance,
        sensor_valid: true,
        source: 'simulation'
      };

      try {
        const res = await sendReading(payload);
        const updated = res.data?.data?.bin;
        let color = colors.green;
        if (updated?.status === 'FULL') color = colors.red;
        else if (updated?.status === 'HIGH') color = colors.yellow;
        else if (updated?.status === 'MEDIUM') color = colors.blue;

        console.log(`  -> ${bin.id} (${bin.location}): ${color}${updated?.status}${colors.reset} [${updated?.fill_percentage}% | ${updated?.distance_cm} cm]`);
      } catch (err) {
        console.error(`  ${colors.red}[!] ${bin.id} failed:${colors.reset} ${err.message}`);
      }
    }
    console.log('');
  }

  await loop();
  if (!SEND_ONCE) {
    setInterval(loop, INTERVAL * 1000);
  }
}

runScenario(SCENARIO);
