import { apiFetch, type Gateway, type GatewayConfig, type GatewayStatus, type IotNode } from './client';

export function getGateways() {
  return apiFetch<Gateway[]>('/api/gateways', {});
}

export function getGatewayStatus(gatewayId: string) {
  return apiFetch<GatewayStatus>(`/api/gateways/${encodeURIComponent(gatewayId)}/status`, {});
}

export function getGatewayNodes(gatewayId: string) {
  return apiFetch<IotNode[]>(`/api/gateways/${encodeURIComponent(gatewayId)}/nodes`, {});
}

export function updateGatewayConfig(gatewayId: string, config: Partial<GatewayConfig>) {
  return apiFetch<Gateway>(`/api/gateways/${encodeURIComponent(gatewayId)}/config`, { method: 'PUT', body: config });
}

export function unlinkGateway(gatewayId: string) {
  return apiFetch<{ deleted?: boolean }>(`/api/gateways/${encodeURIComponent(gatewayId)}`, { method: 'DELETE' });
}

export function confirmPairingCandidate(gatewayId: string, body: { nodeId: string; bleMac: string; nodeName?: string }) {
  return apiFetch<IotNode>(`/api/gateways/${encodeURIComponent(gatewayId)}/pairing/confirm-candidate`, { method: 'POST', body });
}

export function unpairNode(gatewayId: string, nodeId: string) {
  return apiFetch<{ deleted?: boolean }>(`/api/gateways/${encodeURIComponent(gatewayId)}/nodes/${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
}

export function triggerNodeMeasurement(gatewayId: string, nodeId: string) {
  return apiFetch<{ queued?: boolean }>(`/api/gateways/${encodeURIComponent(gatewayId)}/nodes/${encodeURIComponent(nodeId)}/measure`, { method: 'POST' });
}

export function updateNodeConfig(gatewayId: string, nodeId: string, config: Record<string, unknown>) {
  return apiFetch<IotNode>(`/api/gateways/${encodeURIComponent(gatewayId)}/nodes/${encodeURIComponent(nodeId)}/config`, { method: 'PUT', body: config });
}
