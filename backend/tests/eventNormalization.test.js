'use strict';

const { normaliseEventType } = require('../controllers/logController');

describe('normaliseEventType', () => {
  test('maps legacy head_movement to canonical head_turned', () => {
    expect(normaliseEventType('head_movement')).toBe('head_turned');
  });

  test('maps legacy multiple_persons to canonical multiple_faces', () => {
    expect(normaliseEventType('multiple_persons')).toBe('multiple_faces');
  });

  test('keeps canonical values unchanged', () => {
    expect(normaliseEventType('gaze_away')).toBe('gaze_away');
    expect(normaliseEventType('head_turned')).toBe('head_turned');
    expect(normaliseEventType('tab_switch')).toBe('tab_switch');
    expect(normaliseEventType('face_absent')).toBe('face_absent');
    expect(normaliseEventType('multiple_faces')).toBe('multiple_faces');
  });
});
