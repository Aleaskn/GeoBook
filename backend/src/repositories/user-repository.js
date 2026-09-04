export function createUserRepository(pool) {
  return {
    async create({ name, email, passwordHash, city, publicArea }) {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, city, public_area)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, city, public_area AS "publicArea",
                   share_radius_km AS "shareRadiusKm",
                   location_consent_at AS "locationConsentAt",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [name, email, passwordHash, city, publicArea],
      );

      return result.rows[0];
    },

    async findAuthenticationByEmail(email) {
      const result = await pool.query(
        `SELECT id, name, email, password_hash AS "passwordHash", role, city,
                public_area AS "publicArea", share_radius_km AS "shareRadiusKm",
                location_consent_at AS "locationConsentAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [email],
      );

      return result.rows[0] ?? null;
    },

    async findById(userId) {
      const result = await pool.query(
        `SELECT id, name, email, role, city, public_area AS "publicArea",
                share_radius_km AS "shareRadiusKm",
                location_consent_at AS "locationConsentAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM users
         WHERE id = $1`,
        [userId],
      );

      return result.rows[0] ?? null;
    },

    async updateProfile(userId, { name, city, publicArea, shareRadiusKm }) {
      const result = await pool.query(
        `UPDATE users
         SET name = COALESCE($2, name),
             city = COALESCE($3, city),
             public_area = COALESCE($4, public_area),
             share_radius_km = COALESCE($5, share_radius_km)
         WHERE id = $1
         RETURNING id, name, email, role, city, public_area AS "publicArea",
                   share_radius_km AS "shareRadiusKm",
                   location_consent_at AS "locationConsentAt",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [userId, name ?? null, city ?? null, publicArea ?? null, shareRadiusKm ?? null],
      );

      return result.rows[0] ?? null;
    },

    async updateLocation(userId, { lat, lon }) {
      const result = await pool.query(
        `UPDATE users
         SET location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
             location_consent_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, name, email, role, city, public_area AS "publicArea",
                   share_radius_km AS "shareRadiusKm",
                   location_consent_at AS "locationConsentAt",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [userId, lon, lat],
      );

      return result.rows[0] ?? null;
    },

    async deleteLocation(userId) {
      const result = await pool.query(
        `UPDATE users
         SET location = NULL, location_consent_at = NULL
         WHERE id = $1
         RETURNING id`,
        [userId],
      );

      return result.rows[0] ?? null;
    },
  };
}
