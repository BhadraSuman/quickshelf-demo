/**
 * Abstract Transport interface.
 * Implemented initially by WebSocket, allowing future zero-impact swap to MQTT.
 */
export interface ITransport {
  send(message: string): Promise<void> | void;
  onMessage(handler: (data: string) => void): void;
  onDisconnect(handler: (reason: string) => void): void;
  close(): Promise<void> | void;
}
