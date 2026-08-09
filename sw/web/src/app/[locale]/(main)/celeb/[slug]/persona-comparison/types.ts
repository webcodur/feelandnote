import type { PersonaStats } from "@/lib/persona/types";
import type { PersonaMatchEvidence } from "@/lib/persona/utils";

export interface ComparisonChartProps {
  data: PersonaMatchEvidence[];
  subjectName: string;
  candidateName: string;
  title: string;
  preferredAxis?: keyof PersonaStats;
}

export interface CompassChartProps extends ComparisonChartProps {
  opposite: boolean;
  twoColumn?: boolean;
}
