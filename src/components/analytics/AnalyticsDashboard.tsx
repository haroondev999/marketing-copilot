"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { useMemo } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  change?: string;
}

export function MetricCard({ label, value, trend, change }: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
      ? "text-red-600"
      : "text-muted-foreground";

  return (
    <Card className="p-4 bg-card border-border/50">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {change && (
            <Badge variant="outline" className={trendColor}>
              {change}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

interface AnalyticsDashboardProps {
  campaignId: string;
  metrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    ctr?: number;
    conversionRate?: number;
    spend?: number;
    roi?: number;
  };
  historicalMetrics?: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    ctr?: number;
    conversionRate?: number;
    spend?: number;
    roi?: number;
  };
}

function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (!previous || previous === 0) return "stable";
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 2) return "stable";
  return change > 0 ? "up" : "down";
}

function calculateChange(current: number, previous: number): string {
  if (!previous || previous === 0) return "N/A";
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function generatePerformanceSummary(
  metrics: AnalyticsDashboardProps["metrics"],
  historicalMetrics?: AnalyticsDashboardProps["historicalMetrics"]
): string {
  const impressions = metrics.impressions || 0;
  const clicks = metrics.clicks || 0;
  const conversions = metrics.conversions || 0;
  const ctr = metrics.ctr || 0;
  const conversionRate = metrics.conversionRate || 0;

  if (impressions === 0 && clicks === 0 && conversions === 0) {
    return "Campaign is in early stages. Data will be available once the campaign starts generating engagement.";
  }

  const parts: string[] = [];

  if (historicalMetrics) {
    const impressionTrend = calculateTrend(impressions, historicalMetrics.impressions || 0);
    const clickTrend = calculateTrend(clicks, historicalMetrics.clicks || 0);
    const conversionTrend = calculateTrend(conversions, historicalMetrics.conversions || 0);

    if (impressionTrend === "up" && clickTrend === "up") {
      parts.push("Your campaign is showing strong growth in reach and engagement.");
    } else if (impressionTrend === "down" || clickTrend === "down") {
      parts.push("Campaign performance has declined compared to previous period.");
    } else {
      parts.push("Campaign performance is stable.");
    }

    if (conversionTrend === "up") {
      parts.push("Conversion rates are improving.");
    } else if (conversionTrend === "down") {
      parts.push("Consider optimizing your conversion funnel.");
    }
  } else {
    if (ctr > 2) {
      parts.push("Click-through rate is performing well.");
    } else if (ctr > 0 && ctr < 1) {
      parts.push("Click-through rate could be improved with better targeting or creative.");
    }

    if (conversionRate > 3) {
      parts.push("Conversion rate is strong.");
    } else if (conversionRate > 0 && conversionRate < 1) {
      parts.push("Consider optimizing landing pages to improve conversion rate.");
    }
  }

  if (parts.length === 0) {
    parts.push("Continue monitoring campaign performance and make data-driven optimizations.");
  }

  return parts.join(" ");
}

export function AnalyticsDashboard({ 
  campaignId, 
  metrics, 
  historicalMetrics 
}: AnalyticsDashboardProps) {
  const displayMetrics = useMemo(() => {
    const hist = historicalMetrics || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      conversionRate: 0,
      roi: 0,
    };

    return [
      {
        label: "Impressions",
        value: metrics.impressions?.toLocaleString() || "0",
        trend: calculateTrend(metrics.impressions || 0, hist.impressions || 0),
        change: calculateChange(metrics.impressions || 0, hist.impressions || 0),
      },
      {
        label: "Clicks",
        value: metrics.clicks?.toLocaleString() || "0",
        trend: calculateTrend(metrics.clicks || 0, hist.clicks || 0),
        change: calculateChange(metrics.clicks || 0, hist.clicks || 0),
      },
      {
        label: "CTR",
        value: `${metrics.ctr?.toFixed(2) || "0"}%`,
        trend: calculateTrend(metrics.ctr || 0, hist.ctr || 0),
        change: calculateChange(metrics.ctr || 0, hist.ctr || 0),
      },
      {
        label: "Conversions",
        value: metrics.conversions?.toLocaleString() || "0",
        trend: calculateTrend(metrics.conversions || 0, hist.conversions || 0),
        change: calculateChange(metrics.conversions || 0, hist.conversions || 0),
      },
      {
        label: "Conversion Rate",
        value: `${metrics.conversionRate?.toFixed(2) || "0"}%`,
        trend: calculateTrend(metrics.conversionRate || 0, hist.conversionRate || 0),
        change: calculateChange(metrics.conversionRate || 0, hist.conversionRate || 0),
      },
      {
        label: "ROI",
        value: `${metrics.roi?.toFixed(1) || "0"}x`,
        trend: calculateTrend(metrics.roi || 0, hist.roi || 0),
        change: calculateChange(metrics.roi || 0, hist.roi || 0),
      },
    ];
  }, [metrics, historicalMetrics]);

  const performanceSummary = useMemo(
    () => generatePerformanceSummary(metrics, historicalMetrics),
    [metrics, historicalMetrics]
  );

  return (
    <Card className="mt-4 p-6 bg-card border-border/50">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Campaign Analytics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {displayMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Performance Summary</h4>
          <p className="text-sm text-muted-foreground">
            {performanceSummary}
          </p>
        </div>
      </div>
    </Card>
  );
}