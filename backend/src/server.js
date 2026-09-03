import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { createApp } from './app.js';
import { createDatabasePool } from './config/database.js';
import { ConfigurationError, loadConfig } from './config/env.js';

// Il percorso è relativo al modulo, quindi non cambia avviando npm dalla radice o dal backend.
const envPath = fileURLToPath(new URL('../.env', import.meta.url));

dotenv.config({ path: envPath, quiet: true });

export async function startServer({
  environment = process.env,
  logger = console,
  poolFactory = createDatabasePool,
} = {}) {
  const config = loadConfig(environment);
  const pool = poolFactory(config);

  try {
    // Fallire prima dell'ascolto evita un server apparentemente attivo ma privo di persistenza.
    await pool.query('SELECT 1');
  } catch (error) {
    await pool.end();
    throw new Error('Connessione iniziale al database non riuscita.', { cause: error });
  }

  const app = createApp({ config, pool, logger });
  const server = app.listen(config.port);

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
  } catch (error) {
    await pool.end();
    throw error;
  }

  logger.log(`GeoBook API in ascolto sulla porta ${config.port}.`);

  return { app, config, pool, server };
}

export function installShutdownHandlers({ server, pool, logger = console }) {
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.log(`Ricevuto ${signal}. Arresto del server in corso.`);

    server.close(async (serverError) => {
      try {
        await pool.end();
      } catch (poolError) {
        logger.error(poolError);
        process.exitCode = 1;
      }

      if (serverError) {
        logger.error(serverError);
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

function reportStartupError(error) {
  if (error instanceof ConfigurationError) {
    const fields = error.details.map((detail) => detail.field).join(', ');
    console.error(`${error.message} Controllare: ${fields}.`);
  } else {
    console.error('Impossibile avviare GeoBook API. Controllare database e configurazione.');
  }

  process.exitCode = 1;
}

// L'applicazione resta importabile nei test senza aprire automaticamente una porta di rete.
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer()
    .then((resources) => installShutdownHandlers(resources))
    .catch(reportStartupError);
}
