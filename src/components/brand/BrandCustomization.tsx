"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Type, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface BrandKit {
  id?: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  tone: string;
  values: string;
  logoUrl?: string;
  isActive?: boolean;
}

export function BrandCustomization() {
  const [brandKit, setBrandKit] = useState<BrandKit>({
    name: "",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    fontFamily: "Inter",
    tone: "Professional and friendly",
    values: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBrandKit();
  }, []);

  const loadBrandKit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/brand?active=true');

      if (!response.ok) {
        if (response.status === 404) {
          return;
        }
        throw new Error('Failed to load brand kit');
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setBrandKit(data[0]);
      } else if (data && !Array.isArray(data)) {
        setBrandKit(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load brand kit';
      setError(errorMessage);
      console.error('Error loading brand kit:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: brandKit.name,
        primaryColor: brandKit.primaryColor,
        secondaryColor: brandKit.secondaryColor,
        fontFamily: brandKit.fontFamily,
        tone: brandKit.tone,
        values: brandKit.values,
        logoUrl: brandKit.logoUrl,
      };

      const method = brandKit.id ? 'PATCH' : 'POST';
      const body = brandKit.id
        ? JSON.stringify({ id: brandKit.id, ...payload })
        : JSON.stringify(payload);

      const response = await fetch('/api/brand', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save brand kit');
      }

      const saved = await response.json();
      setBrandKit(saved);

      toast({
        title: "Success",
        description: "Brand kit saved successfully!",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save brand kit';
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      console.error('Error saving brand kit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border/50">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading brand kit...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border/50">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Brand Customization</h3>
          <p className="text-sm text-muted-foreground">
            Define your brand identity to ensure consistent messaging across all campaigns.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="identity">
              <Palette className="w-4 h-4 mr-2" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="voice">
              <Type className="w-4 h-4 mr-2" />
              Voice
            </TabsTrigger>
            <TabsTrigger value="assets">
              <ImageIcon className="w-4 h-4 mr-2" />
              Assets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-4">
            <div>
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={brandKit.name}
                onChange={(e) => setBrandKit({ ...brandKit, name: e.target.value })}
                placeholder="Your Brand Name"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={brandKit.primaryColor}
                    onChange={(e) =>
                      setBrandKit({ ...brandKit, primaryColor: e.target.value })
                    }
                    className="w-20 h-10"
                    disabled={isSaving}
                  />
                  <Input
                    value={brandKit.primaryColor}
                    onChange={(e) =>
                      setBrandKit({ ...brandKit, primaryColor: e.target.value })
                    }
                    placeholder="#000000"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={brandKit.secondaryColor}
                    onChange={(e) =>
                      setBrandKit({ ...brandKit, secondaryColor: e.target.value })
                    }
                    className="w-20 h-10"
                    disabled={isSaving}
                  />
                  <Input
                    value={brandKit.secondaryColor}
                    onChange={(e) =>
                      setBrandKit({ ...brandKit, secondaryColor: e.target.value })
                    }
                    placeholder="#ffffff"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="fontFamily">Font Family</Label>
              <Input
                id="fontFamily"
                value={brandKit.fontFamily}
                onChange={(e) => setBrandKit({ ...brandKit, fontFamily: e.target.value })}
                placeholder="Inter, Arial, Helvetica"
                disabled={isSaving}
              />
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4">
            <div>
              <Label htmlFor="tone">Brand Tone</Label>
              <Input
                id="tone"
                value={brandKit.tone}
                onChange={(e) => setBrandKit({ ...brandKit, tone: e.target.value })}
                placeholder="e.g., Professional and friendly, Casual and fun"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="values">Brand Values & Guidelines</Label>
              <Textarea
                id="values"
                value={brandKit.values}
                onChange={(e) => setBrandKit({ ...brandKit, values: e.target.value })}
                placeholder="Describe your brand values, messaging guidelines, and key differentiators..."
                rows={6}
                disabled={isSaving}
              />
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={brandKit.logoUrl || ""}
                onChange={(e) => setBrandKit({ ...brandKit, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                disabled={isSaving}
              />
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground">
                Upload your brand assets (logos, images, templates) to use them in your
                campaigns. Supported formats: PNG, JPG, SVG.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Brand Kit'
            )}
          </Button>
          <Button variant="outline" disabled={isSaving}>
            Preview
          </Button>
        </div>
      </div>
    </Card>
  );
}
