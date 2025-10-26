"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Share2, Megaphone, MessageSquare, Check, Edit, Rocket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CampaignPreviewProps {
  campaignId: string;
}

export function CampaignPreview({ campaignId }: CampaignPreviewProps) {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaign?id=${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaign(data);
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const response = await fetch("/api/campaign/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      if (response.ok) {
        toast({
          title: "Campaign Launched!",
          description: "Your campaign is now live across all channels.",
        });
        fetchCampaign();
      } else {
        throw new Error("Launch failed");
      }
    } catch (error) {
      toast({
        title: "Launch Failed",
        description: "There was an error launching your campaign.",
        variant: "destructive",
      });
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <Card className="mt-4 p-6 bg-card border-border/50">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!campaign) return null;

  const { goal, channels, content, status, budget } = campaign;

  return (
    <Card className="mt-4 p-6 bg-card border-border/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Campaign Preview</h3>
            <p className="text-sm text-muted-foreground">{goal}</p>
          </div>
          <Badge variant={status === "ready" ? "default" : status === "launched" ? "secondary" : "outline"}>
            {status === "ready" && <Check className="w-3 h-3 mr-1" />}
            {status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Channels:</span>
            <div className="flex gap-2 mt-1">
              {channels.map((channel: string) => (
                <Badge key={channel} variant="outline">
                  {channel === "email" && <Mail className="w-3 h-3 mr-1" />}
                  {channel === "social" && <Share2 className="w-3 h-3 mr-1" />}
                  {channel === "ppc" && <Megaphone className="w-3 h-3 mr-1" />}
                  {channel === "sms" && <MessageSquare className="w-3 h-3 mr-1" />}
                  {channel}
                </Badge>
              ))}
            </div>
          </div>
          {budget && (
            <div>
              <span className="text-muted-foreground">Budget:</span>
              <p className="font-medium">${budget.toLocaleString()}</p>
            </div>
          )}
        </div>

        <Tabs defaultValue={Object.keys(content)[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(content).length}, 1fr)` }}>
            {Object.keys(content).map((channel) => (
              <TabsTrigger key={channel} value={channel} className="capitalize">
                {channel}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(content).map(([channel, channelContent]: [string, any]) => (
            <TabsContent key={channel} value={channel} className="space-y-4">
              {channel === "email" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Subject Line</label>
                    <p className="text-sm font-medium mt-1">{channelContent.subject}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Preview Text</label>
                    <p className="text-sm text-muted-foreground mt-1">{channelContent.preview}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email Body</label>
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <p className="text-sm whitespace-pre-wrap">{channelContent.body}</p>
                    </div>
                  </div>
                </div>
              )}

              {(channel === "facebook" || channel === "instagram") && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Post Content</label>
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <p className="text-sm whitespace-pre-wrap">{channelContent.body}</p>
                      {channelContent.description && (
                        <p className="text-sm text-primary mt-2">{channelContent.description}</p>
                      )}
                    </div>
                  </div>
                  {channelContent.cta && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Call to Action</label>
                      <p className="text-sm font-medium mt-1">{channelContent.cta}</p>
                    </div>
                  )}
                </div>
              )}

              {channel === "ppc" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Ad Headline</label>
                    <p className="text-sm font-medium mt-1">{channelContent.headline}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{channelContent.description}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Call to Action</label>
                    <p className="text-sm font-medium mt-1">{channelContent.cta}</p>
                  </div>
                </div>
              )}

              {channel === "sms" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SMS Message</label>
                  <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-sm">{channelContent.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {channelContent.body?.length || 0}/160 characters
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit Content
          </Button>
          {status !== "launched" && (
            <Button size="sm" className="ml-auto" onClick={handleLaunch} disabled={launching}>
              <Rocket className="w-4 h-4 mr-2" />
              {launching ? "Launching..." : "Launch Campaign"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}