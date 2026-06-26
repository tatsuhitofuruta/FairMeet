import { describe, expect, it } from 'vitest';
import {
  buildTransitPlanUrl,
  formatTransitServiceTime,
  stationTransitEndpoint,
  summarizeTransitPlan,
  type TransitPlanResponse,
} from '../src/lib/transitApi';
import type { Station } from '../src/lib/types';

const station: Station = {
  c: 1,
  n: '東京',
  o: '東京',
  k: 'とうきょう',
  p: 13,
  lat: 35.681236,
  lng: 139.767125,
  l: [],
};

describe('stationTransitEndpoint', () => {
  it('builds a geo endpoint accepted by Transit API', () => {
    expect(stationTransitEndpoint(station)).toBe('geo:35.681236,139.767125');
  });
});

describe('buildTransitPlanUrl', () => {
  it('builds a rail-only Transit API plan URL', () => {
    const url = buildTransitPlanUrl(
      {
        from: 'geo:35.681236,139.767125',
        to: 'geo:35.689729,139.700464',
        fromLabel: '東京',
        toLabel: '新宿',
        type: 'departure',
        allowModes: 'rail',
        avoidModes: 'bus,air,ferry',
        maxTransfers: 6,
        numItineraries: 1,
      },
      'https://example.test',
    );

    expect(url).toBe(
      'https://example.test/api/v1/plan?from=geo%3A35.681236%2C139.767125&to=geo%3A35.689729%2C139.700464&fromLabel=%E6%9D%B1%E4%BA%AC&toLabel=%E6%96%B0%E5%AE%BF&type=departure&allowModes=rail&avoidModes=bus%2Cair%2Cferry&maxTransfers=6&numItineraries=1',
    );
  });
});

describe('formatTransitServiceTime', () => {
  it('formats normal and after-midnight service seconds', () => {
    expect(formatTransitServiceTime(9 * 3600 + 5 * 60)).toBe('09:05');
    expect(formatTransitServiceTime(25 * 3600 + 30 * 60)).toBe('翌日 01:30');
  });
});

describe('summarizeTransitPlan', () => {
  it('summarizes the first transit journey', () => {
    const plan: TransitPlanResponse = {
      date: '20260626',
      type: 'departure',
      timezone: 'Asia/Tokyo',
      from: { id: 'geo:35.681236,139.767125', name: '東京' },
      to: { id: 'geo:35.689729,139.700464', name: '新宿' },
      journeys: [
        {
          departureSecs: 9 * 3600,
          arrivalSecs: 9 * 3600 + 18 * 60,
          durationSecs: 18 * 60,
          transferCount: 0,
          fare: { currency: 'JPY', ticket: 210 },
          accessWalkSecs: 60,
          egressWalkSecs: 120,
          legs: [
            {
              kind: 'transit',
              routeName: '中央線快速',
              mode: 'rail',
              from: { id: 'tokyo', name: '東京' },
              to: { id: 'shinjuku', name: '新宿' },
              departureSecs: 9 * 3600,
              arrivalSecs: 9 * 3600 + 16 * 60,
            },
          ],
        },
      ],
    };

    expect(summarizeTransitPlan(plan)).toEqual({
      durationMinutes: 18,
      transferCount: 0,
      departureLabel: '09:00',
      arrivalLabel: '09:18',
      routeNames: ['中央線快速'],
      fareYen: 210,
      accessWalkMinutes: 1,
      egressWalkMinutes: 2,
    });
  });
});
