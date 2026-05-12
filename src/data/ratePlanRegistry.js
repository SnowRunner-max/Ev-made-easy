import ratePlans from './ratePlans.json';
import sceRatePlans from './sceRatePlans.json';
import tdpudRatePlans from './tdpudRatePlans.json';
import libertyRatePlans from './libertyRatePlans.json';

/** Static registry mapping serviceAreaId → imported rate plan data */
export const RATE_PLAN_REGISTRY = {
  'pge-3ce-sbco': ratePlans,
  'pge-sjce-scc': ratePlans,
  'pge-pce-smc': ratePlans,
  'pge-scp-son': ratePlans,
  'pge-ava-eba': ratePlans,
  'pge-svce-sv': ratePlans,
  'pge-mce-mar': ratePlans,
  'pge-rcea-hum': ratePlans,
  'pge-vce-yol': ratePlans,
  'pge-pioneer-pla': ratePlans,
  'pge-cpsf-sf': ratePlans,
  'pge-kccp-mon': ratePlans,
  'pge-only': ratePlans,
  'sce-cpa-la': sceRatePlans,
  'sce-sbce-sb': sceRatePlans,
  'sce-3ce-sb': sceRatePlans,
  'sce-only': sceRatePlans,
  'tdpud-truckee': tdpudRatePlans,
  'liberty-tahoe': libertyRatePlans,
};
