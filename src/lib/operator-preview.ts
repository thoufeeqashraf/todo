import type { OperatorRole } from "@/lib/session-token";

export type AttentionState = "Due today" | "Proof missing" | "Waiting" | "Ready";

type Company = {
  id: string;
  name: string;
  industry: string;
  place: string;
  people: number;
  openTasks: number;
  onStaffDesk: boolean;
};

type Attention = {
  id: string;
  companyId: string;
  title: string;
  detail: string;
  when: string;
  state: AttentionState;
};

const companies: Company[] = [
  {
    id: "harbour",
    name: "Harbour & Rye",
    industry: "Restaurant",
    place: "Cape Town",
    people: 38,
    openTasks: 6,
    onStaffDesk: true,
  },
  {
    id: "northlane",
    name: "Northlane",
    industry: "Retail",
    place: "Johannesburg",
    people: 54,
    openTasks: 9,
    onStaffDesk: false,
  },
  {
    id: "cedar",
    name: "Cedar Court",
    industry: "Property",
    place: "Durban",
    people: 22,
    openTasks: 4,
    onStaffDesk: true,
  },
  {
    id: "site14",
    name: "Site 14",
    industry: "Construction",
    place: "Pretoria",
    people: 41,
    openTasks: 7,
    onStaffDesk: false,
  },
  {
    id: "kiln",
    name: "Kiln & Co",
    industry: "Café",
    place: "Stellenbosch",
    people: 16,
    openTasks: 3,
    onStaffDesk: true,
  },
  {
    id: "yard",
    name: "Yard Goods",
    industry: "Warehouse",
    place: "Gqeberha",
    people: 29,
    openTasks: 5,
    onStaffDesk: false,
  },
];

const attention: Attention[] = [
  {
    id: "lunch-pass",
    companyId: "harbour",
    title: "Close the lunch pass",
    detail: "The photo of the pass line has not come in.",
    when: "Today, 14:00",
    state: "Proof missing",
  },
  {
    id: "flat-21",
    companyId: "cedar",
    title: "Flat 21 follow-up",
    detail: "Security left a comment. The hallway photo is in.",
    when: "Today, 15:30",
    state: "Ready",
  },
  {
    id: "opening",
    companyId: "kiln",
    title: "Opening checklist",
    detail: "Two items are still open before the lunch seating.",
    when: "Today, 11:00",
    state: "Due today",
  },
  {
    id: "aisle",
    companyId: "northlane",
    title: "Aisle 4 count",
    detail: "Waiting on the floor lead to confirm the shelf photo.",
    when: "Today, 16:00",
    state: "Waiting",
  },
  {
    id: "scaffold",
    companyId: "site14",
    title: "Scaffold inspection",
    detail: "The video stops short of the east elevation.",
    when: "Today, 17:00",
    state: "Proof missing",
  },
  {
    id: "dock",
    companyId: "yard",
    title: "Inbound bay",
    detail: "Dispatch has not confirmed the dock photo.",
    when: "Tomorrow, 08:00",
    state: "Waiting",
  },
];

export type OperatorBoard = {
  scope: string;
  lede: string;
  companies: Company[];
  attention: Array<Attention & { company: string; industry: string; place: string }>;
  metrics: Array<{ label: string; value: string; note: string }>;
};

export function operatorBoard(role: OperatorRole): OperatorBoard {
  const visibleCompanies =
    role === "staff" ? companies.filter((company) => company.onStaffDesk) : companies;
  const visibleIds = new Set(visibleCompanies.map((company) => company.id));
  const visibleAttention = attention
    .filter((item) => visibleIds.has(item.companyId))
    .map((item) => {
      const company = companies.find((entry) => entry.id === item.companyId);
      return {
        ...item,
        company: company?.name ?? "Company",
        industry: company?.industry ?? "",
        place: company?.place ?? "",
      };
    });
  const people = visibleCompanies.reduce((sum, company) => sum + company.people, 0);
  const openTasks = visibleCompanies.reduce(
    (sum, company) => sum + company.openTasks,
    0,
  );
  const proofMissing = visibleAttention.filter(
    (item) => item.state === "Proof missing",
  ).length;

  return {
    scope: role === "staff" ? "Your desk" : "The whole floor",
    lede:
      role === "staff"
        ? "The companies on your desk, and the work waiting there."
        : "Every company on the customer app, and the work moving through them.",
    companies: visibleCompanies,
    attention: visibleAttention,
    metrics: [
      {
        label: "Companies",
        value: String(visibleCompanies.length),
        note: role === "staff" ? "On your desk" : "On the platform",
      },
      {
        label: "People",
        value: String(people),
        note: "Across those companies",
      },
      {
        label: "Open tasks",
        value: String(openTasks),
        note: "Assigned and still open",
      },
      {
        label: "Proof missing",
        value: String(proofMissing),
        note: "Photo or video still due",
      },
    ],
  };
}

export function johannesburgClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "numeric",
    hourCycle: "h23",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour"));
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return {
    greeting,
    dateLabel: `${value("weekday")}, ${value("day")} ${value("month")}`,
  };
}
