import { AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Anomaly } from "@/lib/ai/anomaly-detector";

type AnomalyAlertProps = {
  anomalies: Anomaly[];
};

const riskSummaryByType: Record<Anomaly["type"], string> = {
  heavy: "Can raise risk of iron-deficiency anemia and may signal an underlying gynecologic cause.",
  missed:
    "Could relate to pregnancy, stress, thyroid, or hormonal conditions and needs medical review if persistent.",
  delayed: "May reflect hormonal shift, stress, thyroid changes, or other cycle-disrupting factors.",
  frequent:
    "Repeated short cycles can affect quality of life and may point to hormone or ovulatory issues.",
  irregular:
    "Large cycle swings can indicate ovulation variability and may make cycle prediction less reliable.",
};

export function AnomalyAlert({ anomalies }: AnomalyAlertProps) {
  const showUrgentCareHint = anomalies.some(
    (item) => item.type === "heavy" || item.type === "missed",
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Pattern watch</CardTitle>
        <CardDescription>
          Screening flags from cycle interval, bleed duration, and regularity trends. These are not a diagnosis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {anomalies.length ? (
          <div className="space-y-3">
            {showUrgentCareHint ? (
              <div className="rounded-[20px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning">
                Seek urgent care now if bleeding soaks one pad or tampon hourly for more than 2
                hours, or if you have dizziness, fainting, chest pain, or shortness of breath.
              </div>
            ) : null}

            {anomalies.map((anomaly) => (
              <div
                key={`${anomaly.type}-${anomaly.message}`}
                className="rounded-[24px] border border-line/70 bg-card-strong p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {anomaly.severity === "urgent" ? (
                      <ShieldAlert className="size-4 text-warning" />
                    ) : (
                      <AlertTriangle className="size-4 text-primary" />
                    )}
                    <p className="text-sm font-semibold text-foreground">{anomaly.message}</p>
                  </div>
                  <Badge
                    variant={
                      anomaly.severity === "urgent"
                        ? "warning"
                        : anomaly.severity === "warning"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {anomaly.severity}
                  </Badge>
                </div>

                <p className="mt-2 text-xs leading-6 text-muted">
                  <span className="font-semibold text-foreground">Why this matters:</span>{" "}
                  {riskSummaryByType[anomaly.type]}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{anomaly.recommendation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-[24px] border border-dashed border-line bg-card px-6 text-center">
            <Sparkles className="size-8 text-secondary" />
            <p className="mt-3 text-base font-semibold text-foreground">No active cycle flags</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
              Keep logging for a few cycles and Ember will start highlighting changes worth paying attention to.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
