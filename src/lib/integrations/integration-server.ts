import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export class IntegrationServer {
  async testConnection(id: string, userId: string): Promise<boolean> {
    const integration = await prisma.integration.findUnique({
      where: { id, userId },
    });

    if (!integration) return false;

    const credentials = decrypt(integration.credentials as any);

    switch (integration.type) {
      case "email":
        return this.testEmailConnection(integration.name, credentials);
      case "social":
        return this.testSocialConnection(integration.name, credentials);
      case "ppc":
        return this.testPPCConnection(integration.name, credentials);
      case "sms":
        return this.testSMSConnection(integration.name, credentials);
      case "crm":
        return this.testCRMConnection(integration.name, credentials);
      default:
        return false;
    }
  }

  private async testEmailConnection(
    name: string,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    if (name === "Mailchimp" && credentials.apiKey) {
      try {
        const datacenter = credentials.apiKey.split("-").pop();
        const response = await fetch(
          `https://${datacenter}.api.mailchimp.com/3.0/ping`,
          { headers: { Authorization: `Bearer ${credentials.apiKey}` } },
        );
        return response.ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async testSocialConnection(
    name: string,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    if (!credentials.accessToken) return false;

    try {
      let testUrl = "";

      switch (name.toLowerCase()) {
        case "facebook":
          testUrl = "https://graph.facebook.com/me?fields=id,name";
          break;
        case "instagram":
          testUrl = "https://graph.facebook.com/me?fields=id,username";
          break;
        case "twitter":
          testUrl = "https://api.twitter.com/2/users/me";
          break;
        case "linkedin":
          testUrl = "https://api.linkedin.com/v2/me";
          break;
        default:
          return false;
      }

      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async testPPCConnection(
    name: string,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    if (!credentials.apiKey) return false;

    try {
      let testUrl = "";

      switch (name.toLowerCase()) {
        case "google ads":
          testUrl =
            "https://googleads.googleapis.com/v14/customers:listAccessibleCustomers";
          break;
        case "facebook ads":
          testUrl = "https://graph.facebook.com/me/adaccounts";
          break;
        default:
          return !!credentials.apiKey;
      }

      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async testSMSConnection(
    name: string,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    if (!credentials.apiKey) return false;

    try {
      let testUrl = "";

      switch (name.toLowerCase()) {
        case "twilio":
          const accountSid = credentials.accountSid;
          if (!accountSid) return false;
          testUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
          break;
        default:
          return !!credentials.apiKey;
      }

      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.apiKey}`).toString("base64")}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async testCRMConnection(
    name: string,
    credentials: Record<string, string>,
  ): Promise<boolean> {
    if (!credentials.apiKey) return false;

    try {
      let testUrl = "";

      switch (name.toLowerCase()) {
        case "salesforce":
          testUrl = `${credentials.instanceUrl}/services/data/v57.0/sobjects`;
          break;
        case "hubspot":
          testUrl = "https://api.hubapi.com/crm/v3/objects/contacts";
          break;
        default:
          return !!credentials.apiKey;
      }

      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
