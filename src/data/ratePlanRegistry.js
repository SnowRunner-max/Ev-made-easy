import serviceAreasData from './serviceAreas.json';
import { getUtilityConfigForServiceArea } from './utilityRegistry';

/** Derived registry mapping serviceAreaId → imported utility rate plan data. */
export const RATE_PLAN_REGISTRY = Object.fromEntries(
  Object.entries(serviceAreasData.serviceAreas).map(([serviceAreaId, serviceArea]) => [
    serviceAreaId,
    getUtilityConfigForServiceArea(serviceArea)?.ratePlans,
  ])
);
