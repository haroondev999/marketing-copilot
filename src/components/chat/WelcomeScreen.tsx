"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Share2, 
  Target, 
  BarChart3, 
  Sparkles,
  Megaphone,
  PenTool,
  Users
} from "lucide-react";

interface WelcomeScreenProps {
  onPromptClick: (prompt: string) => void;
}

export function WelcomeScreen({ onPromptClick }: WelcomeScreenProps) {
  const quickActions = [
    {
      icon: Mail,
      title: "Create Email Campaign",
      description: "Launch targeted email campaigns",
      prompt: "I want to create an email campaign",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Share2,
      title: "Social Media Campaign",
      description: "Engage across social platforms",
      prompt: "Help me create a social media campaign",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: PenTool,
      title: "Generate Content",
      description: "AI-powered content creation",
      prompt: "I need help generating marketing content",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Users,
      title: "Build Audience",
      description: "Create targeted segments",
      prompt: "Help me build an audience segment",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "View Analytics",
      description: "Track campaign performance",
      prompt: "Show me campaign analytics",
      color: "from-indigo-500 to-blue-500"
    },
    {
      icon: Megaphone,
      title: "PPC Campaign",
      description: "Create paid advertising campaigns",
      prompt: "I want to create a PPC campaign",
      color: "from-yellow-500 to-orange-500"
    }
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            AI Marketing Campaign Manager
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create, execute, and optimize marketing campaigns across multiple channels 
            through natural conversation. Just tell me what you need!
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="group relative overflow-hidden border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg cursor-pointer"
                onClick={() => onPromptClick(action.prompt)}
              >
                <div className="p-6 space-y-3">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Card>
            );
          })}
        </div>

        {/* Features */}
        <Card className="p-6 bg-muted/30 border-border/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-primary mb-1">Multi-Channel</div>
              <div className="text-sm text-muted-foreground">Email, Social, PPC, SMS</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-1">AI-Powered</div>
              <div className="text-sm text-muted-foreground">Smart content generation</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-1">Real-Time</div>
              <div className="text-sm text-muted-foreground">Live previews & analytics</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-1">Brand Voice</div>
              <div className="text-sm text-muted-foreground">Consistent messaging</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
