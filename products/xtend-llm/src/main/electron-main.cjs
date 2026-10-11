const {emitLaunchStage} = require('../../scripts/actual-launch-diagnostics.cjs');
emitLaunchStage('module-load', 0);
import('./electron-main.mjs').catch((error) => {
  emitLaunchStage('module-load', 1);
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
