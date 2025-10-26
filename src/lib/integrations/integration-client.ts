export interface Integration {
  id: string;
  name: string;
  type: "email" | "social" | "ppc" | "sms" | "crm";
  status: "connected" | "disconnected" | "error";
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class IntegrationClient {
  async listIntegrations(type?: string): Promise<Integration[]> {
    const params = type ? `?type=${type}` : "";
    const response = await fetch(`/api/integrations${params}`);
    if (!response.ok) throw new Error("Failed to fetch integrations");
    return response.json();
  }

  async testConnection(id: string): Promise<boolean> {
    const response = await fetch(`/api/integrations/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    return data.success;
  }

  async addIntegration(integration: {
    name: string;
    type: string;
    credentials: Record<string, string>;
  }): Promise<Integration> {
    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(integration),
    });
    if (!response.ok) throw new Error("Failed to add integration");
    return response.json();
  }

  async deleteIntegration(id: string): Promise<void> {
    await fetch(`/api/integrations?id=${id}`, { method: "DELETE" });
  }
}

export const integrationClient = new IntegrationClient();
