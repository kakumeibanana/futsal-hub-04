import { type EventType } from "@/data/sampleData";

const tagStyles: Record<EventType, string> = {
  match: "tag-match",
  practice: "tag-practice",
  event: "tag-event",
};

const tagLabels: Record<EventType, string> = {
  match: "試合",
  practice: "練習",
  event: "イベント",
};

const ScheduleTag = ({ type }: { type: EventType }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tagStyles[type]}`}>
    {tagLabels[type]}
  </span>
);

export default ScheduleTag;
