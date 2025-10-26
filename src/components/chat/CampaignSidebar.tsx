"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/store/chat-store";
import { MessageSquare, Calendar, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function CampaignSidebar() {
  const { campaigns, setCurrentCampaign, currentCampaign } = useChatStore();

  if (campaigns.length === 0) return null;

  return (
    <div className="w-80 border-r bg-muted/30 p-4 space-y-4 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Campaigns</h2>
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                currentCampaign?.id === campaign.id
                  ? "border-primary bg-primary/5"
                  : "border-border/50"
              }`}
              onClick={() => setCurrentCampaign(campaign)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-sm line-clamp-2">
                    {campaign.intent.goal}
                  </h3>
                  <Badge
                    variant={campaign.status === "ready" ? "default" : "secondary"}
                    className="ml-2 shrink-0"
                  >
                    {campaign.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {campaign.intent.channels.map((channel) => (
                    <Badge key={channel} variant="outline" className="text-xs">
                      {channel}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(campaign.createdAt, { addSuffix: true })}
                  </div>
                  {campaign.intent.budget && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {campaign.intent.budget.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={() => setCurrentCampaign(null)}>
        <MessageSquare className="w-4 h-4 mr-2" />
        New Campaign
      </Button>
    </div>
  );
}
