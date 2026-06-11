import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const SOURCE_URL = 'https://raw.githubusercontent.com/Seo-4d696b75/station_database/main/out/main/json.zip';
const SOURCE_LABEL = 'Seo-4d696b75/station_database (CC BY-SA 4.0)';
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const cacheDir = join(projectRoot, '.cache');
const zipPath = join(cacheDir, 'json.zip');
const outputPath = join(projectRoot, 'public', 'data', 'graph.json');

export function haversineKm(a, b) {
  const radiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function rideWeightTenths(fromStation, toStation, lineName) {
  const distanceKm = haversineKm(fromStation, toStation);
  const isShinkansen = lineName.includes('新幹線');
  const distanceLimit = isShinkansen ? 150 : 50;
  if (distanceKm > distanceLimit) {
    return null;
  }

  const adjustedDistance = 1.2 * distanceKm;
  const speed = isShinkansen
    ? clamp(60 + 30 * adjustedDistance, 60, 260)
    : clamp(30 + 10 * adjustedDistance, 30, 85);
  const stopLossMinutes = isShinkansen ? 3.0 : 0.5;
  const minutes = (adjustedDistance / speed) * 60 + stopLossMinutes;
  return Math.round(minutes * 10);
}

function walkingWeightTenths(distanceKm) {
  return Math.round((3 + 15 * distanceKm) * 10);
}

function stationCodeFromListItem(item) {
  if (typeof item === 'number') {
    return item;
  }
  if (typeof item === 'string') {
    return Number(item);
  }
  return Number(item.code ?? item.station_code ?? item.stationCode);
}

function lineDetailFor(lineDetails, lineCode) {
  if (lineDetails instanceof Map) {
    return lineDetails.get(lineCode) ?? lineDetails.get(String(lineCode));
  }
  return lineDetails[lineCode] ?? lineDetails[String(lineCode)];
}

function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function addEdge(edges, seen, stats, type, a, b, weight) {
  if (a === b || weight == null || weight <= 0) {
    return;
  }
  const key = edgeKey(a, b);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  edges.push([a, b, weight]);
  stats[type] += 1;
}

export function buildGraph(rawStations, rawLines, lineDetails) {
  const activeRawLines = rawLines.filter((line) => !line.closed);
  const rawLineCodeToIndex = new Map(activeRawLines.map((line, index) => [Number(line.code), index]));
  const lines = activeRawLines.map((line) => ({
    n: String(line.name),
    c: line.color ?? null,
  }));

  const activeStations = rawStations.filter((station) => !station.closed);
  const stationCodeToIndex = new Map();
  const stations = activeStations.map((station, index) => {
    stationCodeToIndex.set(Number(station.code), index);
    return {
      c: Number(station.code),
      n: String(station.name),
      o: String(station.original_name ?? station.name),
      k: String(station.name_kana ?? ''),
      p: Number(station.prefecture),
      lat: Number(station.lat),
      lng: Number(station.lng),
      l: (station.lines ?? [])
        .map((lineCode) => rawLineCodeToIndex.get(Number(lineCode)))
        .filter((lineIndex) => lineIndex !== undefined),
    };
  });

  const nodeCountStart = stations.length;
  let nextNodeId = nodeCountStart;
  const spokeNodeByStationAndLine = new Map();
  for (let stationIndex = 0; stationIndex < stations.length; stationIndex += 1) {
    for (const lineIndex of stations[stationIndex].l) {
      spokeNodeByStationAndLine.set(`${stationIndex}:${lineIndex}`, nextNodeId);
      nextNodeId += 1;
    }
  }

  const edges = [];
  const seenEdges = new Set();
  const stats = { rideEdges: 0, hubEdges: 0, walkingEdges: 0 };

  for (let stationIndex = 0; stationIndex < stations.length; stationIndex += 1) {
    for (const lineIndex of stations[stationIndex].l) {
      const spokeNode = spokeNodeByStationAndLine.get(`${stationIndex}:${lineIndex}`);
      addEdge(edges, seenEdges, stats, 'hubEdges', stationIndex, spokeNode, 25);
    }
  }

  for (const rawLine of activeRawLines) {
    const lineIndex = rawLineCodeToIndex.get(Number(rawLine.code));
    const detail = lineDetailFor(lineDetails, rawLine.code);
    if (lineIndex === undefined || !detail?.station_list) {
      continue;
    }

    const stationIndexes = detail.station_list
      .map(stationCodeFromListItem)
      .map((stationCode) => stationCodeToIndex.get(stationCode))
      .filter((stationIndex) => stationIndex !== undefined);

    for (let i = 0; i < stationIndexes.length - 1; i += 1) {
      const fromIndex = stationIndexes[i];
      const toIndex = stationIndexes[i + 1];
      const fromNode = spokeNodeByStationAndLine.get(`${fromIndex}:${lineIndex}`);
      const toNode = spokeNodeByStationAndLine.get(`${toIndex}:${lineIndex}`);
      if (fromNode === undefined || toNode === undefined) {
        continue;
      }
      const weight = rideWeightTenths(stations[fromIndex], stations[toIndex], lines[lineIndex].n);
      addEdge(edges, seenEdges, stats, 'rideEdges', fromNode, toNode, weight);
    }
  }

  const grid = new Map();
  for (let stationIndex = 0; stationIndex < stations.length; stationIndex += 1) {
    const station = stations[stationIndex];
    const latBucket = Math.floor(station.lat / 0.01);
    const lngBucket = Math.floor(station.lng / 0.01);
    const key = `${latBucket}:${lngBucket}`;
    const bucket = grid.get(key) ?? [];
    bucket.push(stationIndex);
    grid.set(key, bucket);
  }

  for (let stationIndex = 0; stationIndex < stations.length; stationIndex += 1) {
    const station = stations[stationIndex];
    const latBucket = Math.floor(station.lat / 0.01);
    const lngBucket = Math.floor(station.lng / 0.01);
    for (let dLat = -2; dLat <= 2; dLat += 1) {
      for (let dLng = -2; dLng <= 2; dLng += 1) {
        const bucket = grid.get(`${latBucket + dLat}:${lngBucket + dLng}`) ?? [];
        for (const otherIndex of bucket) {
          if (otherIndex <= stationIndex || stations[otherIndex].c === station.c) {
            continue;
          }
          const other = stations[otherIndex];
          const distanceKm = haversineKm(station, other);
          if (distanceKm <= 0.8 || (station.o === other.o && distanceKm <= 1.2)) {
            addEdge(edges, seenEdges, stats, 'walkingEdges', stationIndex, otherIndex, walkingWeightTenths(distanceKm));
          }
        }
      }
    }
  }

  return {
    graph: {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: SOURCE_LABEL,
      nodeCount: nextNodeId,
      stations,
      lines,
      edges,
    },
    stats,
  };
}

async function downloadIfNeeded(offline) {
  mkdirSync(cacheDir, { recursive: true });
  if (existsSync(zipPath)) {
    return;
  }
  if (offline) {
    throw new Error('--offline が指定されていますが .cache/json.zip が存在しません');
  }

  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`station_database の取得に失敗しました (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(zipPath, buffer);
}

function readJsonFromZip(files, path) {
  const file = files[path];
  if (!file) {
    throw new Error(`${path} が zip 内に見つかりません`);
  }
  return JSON.parse(Buffer.from(file).toString('utf8'));
}

export function readStationDatabaseZip(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const stations = readJsonFromZip(files, 'json/station.json');
  const lines = readJsonFromZip(files, 'json/line.json');
  const lineDetails = {};

  for (const line of lines) {
    const path = `json/line/${line.code}.json`;
    if (files[path]) {
      lineDetails[line.code] = readJsonFromZip(files, path);
    }
  }

  return { stations, lines, lineDetails };
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function main() {
  const offline = process.argv.includes('--offline');
  await downloadIfNeeded(offline);
  const database = readStationDatabaseZip(readFileSync(zipPath));
  const { graph, stats } = buildGraph(database.stations, database.lines, database.lineDetails);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(graph)}\n`);
  const fileSize = statSync(outputPath).size;

  console.log(`駅数: ${graph.stations.length}`);
  console.log(`路線数: ${graph.lines.length}`);
  console.log(`ノード数: ${graph.nodeCount}`);
  console.log(`乗車エッジ: ${stats.rideEdges}`);
  console.log(`改札・待ちエッジ: ${stats.hubEdges}`);
  console.log(`徒歩連絡エッジ: ${stats.walkingEdges}`);
  console.log(`ファイルサイズ: ${formatBytes(fileSize)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
