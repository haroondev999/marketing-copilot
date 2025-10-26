"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  integrationClient,
  Integration,
} from "@/lib/integrations/integration-client";
import {
  Mail,
  Share2,
  Megaphone,
  MessageSquare,
  Database,
  Plus,
  Check,
  X,
} from "lucide-react";

export function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    name: "",
    type: "email" as Integration["type"],
    credentials: {} as Record<string, string>,
  });

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const data = await integrationClient.listIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error("Failed to load integrations:", error);
    }
  };

  const handleAddIntegration = async () => {
    try {
      await integrationClient.addIntegration({
        name: newIntegration.name,
        type: newIntegration.type,
        credentials: newIntegration.credentials,
      });
      await loadIntegrations();
      setIsAddDialogOpen(false);
      setNewIntegration({ name: "", type: "email", credentials: {} });
    } catch (error) {
      console.error("Failed to add integration:", error);
      alert("Failed to add integration. Please try again.");
    }
  };

  const handleRemoveIntegration = async (id: string) => {
    try {
      await integrationClient.deleteIntegration(id);
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to remove integration:", error);
      alert("Failed to remove integration. Please try again.");
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const success = await integrationClient.testConnection(id);
      if (success) {
        alert("Connection successful!");
      } else {
        alert("Connection failed. Please check your credentials.");
      }
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to test connection:", error);
      alert("Failed to test connection. Please try again.");
    }
  };

  const getIcon = (type: Integration["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="w-5 h-5" />;
      case "social":
        return <Share2 className="w-5 h-5" />;
      case "ppc":
        return <Megaphone className="w-5 h-5" />;
      case "sms":
        return <MessageSquare className="w-5 h-5" />;
      case "crm":
        return <Database className="w-5 h-5" />;
    }
  };

  const availableIntegrations = [
    { name: "Mailchimp", type: "email" as const },
    { name: "Facebook", type: "social" as const },
    { name: "Instagram", type: "social" as const },
    { name: "Google Ads", type: "ppc" as const },
    { name: "Twilio", type: "sms" as const },
    { name: "HubSpot", type: "crm" as const },
  ];

  return (
    <Card className="p-6 bg-card border-border/50">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Integrations</h3>
            <p className="text-sm text-muted-foreground">
              Connect your marketing platforms to launch campaigns
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Integration</DialogTitle>
                <DialogDescription>
                  Connect a new platform to your marketing campaigns
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    className="w-full p-2 border rounded-md"
                    value={newIntegration.name}
                    onChange={(e) => {
                      const selected = availableIntegrations.find(
                        (i) => i.name === e.target.value,
                      );
                      if (selected) {
                        setNewIntegration({
                          ...newIntegration,
                          name: selected.name,
                          type: selected.type,
                        });
                      }
                    }}
                  >
                    <option value="">Select a platform</option>
                    {availableIntegrations.map((integration) => (
                      <option key={integration.name} value={integration.name}>
                        {integration.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={newIntegration.credentials.apiKey || ""}
                    onChange={(e) =>
                      setNewIntegration({
                        ...newIntegration,
                        credentials: {
                          ...newIntegration.credentials,
                          apiKey: e.target.value,
                        },
                      })
                    }
                    placeholder="Enter your API key"
                  />
                </div>

                <Button
                  onClick={handleAddIntegration}
                  disabled={
                    !newIntegration.name || !newIntegration.credentials.apiKey
                  }
                  className="w-full"
                >
                  Connect Integration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No integrations connected yet.</p>
              <p className="text-sm">
                Add your first integration to start launching campaigns.
              </p>
            </div>
          ) : (
            integrations.map((integration) => (
              <Card key={integration.id} className="p-4 border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getIcon(integration.type)}
                    </div>
                    <div>
                      <h4 className="font-medium">{integration.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {integration.type} integration
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        integration.status === "connected"
                          ? "default"
                          : integration.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {integration.status === "connected" && (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {integration.status === "error" && (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {integration.status}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(integration.id)}
                    >
                      Test
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIntegration(integration.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
