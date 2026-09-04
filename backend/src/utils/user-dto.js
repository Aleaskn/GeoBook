function toIsoString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

export function toUserDto(user) {
  // La allowlist impedisce che nuovi campi interni, in particolare hash o coordinate, escano per errore.
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    city: user.city,
    publicArea: user.publicArea,
    shareRadiusKm: user.shareRadiusKm,
    locationConsentAt: toIsoString(user.locationConsentAt),
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  };
}
