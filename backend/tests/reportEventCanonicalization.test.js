'use strict';

const { toCanonicalEventType } = require('../controllers/reportController');

describe('toCanonicalEventType', () => {
  test('maps legacy head_movement to head_turned', () => {
    expect(toCanonicalEventType('head_movement')).toBe('head_turned');
  });

  test('maps legacy multiple_persons to multiple_faces', () => {
    expect(toCanonicalEventType('multiple_persons')).toBe('multiple_faces');
  });

  test('keeps canonical names unchanged', () => {
    expect(toCanonicalEventType('gaze_away')).toBe('gaze_away');
    expect(toCanonicalEventType('head_turned')).toBe('head_turned');
    expect(toCanonicalEventType('tab_switch')).toBe('tab_switch');
    expect(toCanonicalEventType('face_absent')).toBe('face_absent');
    expect(toCanonicalEventType('multiple_faces')).toBe('multiple_faces');
  });
});
