const ZIP_RE = /^\d{5}$/;

function displayLabel(city) {
  return `${city}, CA`;
}

function resolveTerritoryZip(zip, utilityTerritories) {
  for (const territory of utilityTerritories) {
    const serviceAreaId = territory.zips[zip];
    if (serviceAreaId && serviceAreaId !== 'multi-utility') {
      return serviceAreaId;
    }
  }
  return null;
}

function findTerritoryMatch(matches, utilityTerritories) {
  for (const territory of utilityTerritories) {
    const match = matches.find(m => {
      const serviceAreaId = territory.zips[m.zip];
      return serviceAreaId && serviceAreaId !== 'multi-utility';
    });
    if (match) {
      return { match, serviceAreaId: territory.zips[match.zip] };
    }
  }
  return null;
}

export function createLocationResolver({ zipcodes, utilityTerritories, multiUtilityZips }) {
  const multiZips = multiUtilityZips.zips ?? multiUtilityZips;

  function resolveZip(zip) {
    const info = zipcodes.lookup(zip);
    if (!info) return { ok: false, errorCode: 'invalid_input' };
    if (info.state !== 'CA') return { ok: false, errorCode: 'not_ca' };

    if (multiZips[zip]) {
      return {
        ok: false,
        errorCode: 'multi_utility',
        candidates: multiZips[zip],
        displayLabel: displayLabel(info.city),
        zip,
      };
    }

    const serviceAreaId = resolveTerritoryZip(zip, utilityTerritories);
    if (serviceAreaId) {
      return { ok: true, data: { serviceAreaId, displayLabel: displayLabel(info.city), zip } };
    }

    return { ok: false, errorCode: 'not_supported' };
  }

  function resolveCity(cityName) {
    const matches = zipcodes.lookupByName(cityName, 'CA');
    if (!matches || matches.length === 0) return { ok: false, errorCode: 'invalid_input' };

    const multiMatch = matches.find(m => multiZips[m.zip]);
    if (multiMatch) {
      return {
        ok: false,
        errorCode: 'multi_utility',
        candidates: multiZips[multiMatch.zip],
        displayLabel: displayLabel(multiMatch.city),
        zip: multiMatch.zip,
      };
    }

    const territoryMatch = findTerritoryMatch(matches, utilityTerritories);
    if (territoryMatch) {
      return {
        ok: true,
        data: {
          serviceAreaId: territoryMatch.serviceAreaId,
          displayLabel: displayLabel(territoryMatch.match.city),
          zip: territoryMatch.match.zip,
        },
      };
    }

    return { ok: false, errorCode: 'not_supported' };
  }

  return function resolveLocation(trimmed) {
    return ZIP_RE.test(trimmed) ? resolveZip(trimmed) : resolveCity(trimmed);
  };
}
