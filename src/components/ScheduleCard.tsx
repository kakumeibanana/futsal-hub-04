import { MapPin, Clock } from "lucide-react";
import { type ScheduleEvent } from "@/data/sampleData";
import ScheduleTag from "./ScheduleTag";

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
};

const ScheduleCard = ({ event }: { event: ScheduleEvent }) => (
  <div className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-primary transition-all duration-300">
    <div className="flex-shrink-0 w-14 text-center">
      <div className="text-2xl font-display font-bold text-foreground">{new Date(event.date).getDate()}</div>
      <div className="text-xs text-muted-foreground font-medium">
        {new Date(event.date).toLocaleDateString("ja-JP", { month: "short" })}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <ScheduleTag type={event.type} />
        <span className="text-sm font-display font-semibold text-foreground truncate">{event.title}</span>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock size={12} />{event.time}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={12} />{event.location}</span>
      </div>
    </div>
    <div className="hidden sm:block text-xs text-muted-foreground font-medium">
      {formatDate(event.date)}
    </div>
  </div>
);

export default ScheduleCard;
