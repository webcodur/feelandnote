import type { SpectrumStats } from "@/lib/spectrum/types";
import type { SpectrumMatchEvidence } from "@/lib/spectrum/utils";

export interface ComparisonChartProps {
  data: SpectrumMatchEvidence[];
  subjectName: string;
  candidateName: string;
  title: string;
  preferredAxis?: keyof SpectrumStats;
}

export interface CompassChartProps extends ComparisonChartProps {
  opposite: boolean;
  twoColumn?: boolean;
}
