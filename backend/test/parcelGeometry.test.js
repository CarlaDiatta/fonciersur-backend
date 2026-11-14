const test = require('node:test');
const assert = require('node:assert/strict');
const { parseParcelGeometry } = require('../src/utils/parcelGeometry');

test('calculates the same area for latitude/longitude arrays and GeoJSON polygons', () => {
  const points = [
    [14.7, -17.45],
    [14.7, -17.44],
    [14.71, -17.44],
    [14.71, -17.45],
    [14.7, -17.45],
  ];
  const arrayResult = parseParcelGeometry(points);
  const geoJsonResult = parseParcelGeometry({
    type: 'Polygon',
    coordinates: [[
      [-17.45, 14.7],
      [-17.44, 14.7],
      [-17.44, 14.71],
      [-17.45, 14.71],
      [-17.45, 14.7],
    ]],
  });

  assert.ok(arrayResult.areaSquareMeters > 0);
  assert.equal(geoJsonResult.areaSquareMeters, arrayResult.areaSquareMeters);
});

test('rejects malformed, out-of-range, and degenerate polygons', () => {
  assert.throws(() => parseParcelGeometry('{broken json'), { statusCode: 400 });
  assert.throws(() => parseParcelGeometry([[91, 0], [0, 1], [1, 0]]), { statusCode: 400 });
  assert.throws(() => parseParcelGeometry([[1, 1], [1, 1], [1, 1]]), { statusCode: 400 });
});
