// The calls the plugin makes to the Apple Watch API server. The server holds the trackables the Apple Watch app uses,
// and the details of the Nomie API server, so the watch knows where to send its logs and with which key.
// The paths, the field names and the request bodies are the same as in Nomie Apple Watch v1: the watch app depends on them.
export type Connection = {
  // the Apple Watch API server (the "AW API domain")
  awApiAddress: string;
  // the key for the Apple Watch API server (the "AW API key")
  awApiKey: string;
  // the Nomie API server the watch sends its logs to
  apiAddress: string;
  // the key of the Nomie API server
  apiKey: string;
};

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

const JSON_HEADERS = { 'content-type': 'application/json' };

// Tells the Apple Watch API server which Nomie API server and key to use.
// The Nomie API key goes encoded (base64), as v1 sent it. The reply is read as JSON, as v1 did.
export const syncApiKey = async (connection: Connection, fetchFn: FetchFn = fetch): Promise<unknown> => {
  const response = await fetchFn(`${connection.awApiAddress}/awsets4eapi`, {
    method: 'POST',
    body: JSON.stringify({
      api_key: connection.awApiKey,
      s4eapi_key: btoa(connection.apiKey),
      s4eapi_url: connection.apiAddress,
    }),
    headers: JSON_HEADERS,
  });
  return response.json();
};

// Sends the list of trackables the watch may use. Like v1, the reply is not read.
export const syncTrackables = (connection: Connection, trackables: unknown[], fetchFn: FetchFn = fetch): Promise<Response> =>
  fetchFn(`${connection.awApiAddress}/awsettrackable`, {
    method: 'POST',
    body: JSON.stringify({ api_key: connection.awApiKey, trackables }),
    headers: JSON_HEADERS,
  });
