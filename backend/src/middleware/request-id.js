import { randomUUID } from 'node:crypto';

export function requestId(request, response, next) {
  // Un valore generato dal server evita di considerare attendibile un identificatore del client.
  const id = randomUUID();

  request.requestId = id;
  response.setHeader('X-Request-Id', id);
  next();
}
