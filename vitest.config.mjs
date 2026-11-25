import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.{js,mjs}'],
    // Pin the "device" clock to a zone with daylight saving, so DST bugs show up
    env: { TZ: 'America/Vancouver' },
  },
});
