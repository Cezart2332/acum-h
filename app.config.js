// Dynamic Expo config to inject Mapbox downloads token securely via env
// Usage: set MAPBOX_DOWNLOADS_TOKEN in your environment before building.

/** @type {import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const base = require('./app.json').expo;
  const token = process.env.MAPBOX_DOWNLOADS_TOKEN || process.env.RNMAPBOX_DOWNLOADS_TOKEN;

  const plugins = [...(base.plugins || [])];

  const idx = plugins.findIndex((p) => Array.isArray(p) && p[0] === '@rnmapbox/maps');
  if (idx === -1) {
    plugins.push([
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
        RNMapboxMapsVersion: '11.6.0',
        RNMapboxMapsDownloadToken: token,
        android: { accessToken: base.android?.config?.googleMaps?.apiKey || undefined },
        ios: { accessToken: base.ios?.config?.googleMapsApiKey || undefined },
      },
    ]);
  } else {
    const entry = plugins[idx];
    const options = entry[1] || {};
    plugins[idx] = [
      '@rnmapbox/maps',
      {
        ...options,
        RNMapboxMapsDownloadToken: token,
      },
    ];
  }

  return {
    expo: {
      ...base,
      plugins,
    },
  };
};
