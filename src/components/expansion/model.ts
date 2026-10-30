export const taskColumns = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Done' },
  { id: 'overdue', label: 'Overdue' },
] as const;

export type TaskColumn = (typeof taskColumns)[number]['id'];

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ProjectTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskColumn;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  departmentId: string | null;
  departmentName: string;
  assigneeName: string | null;
};

export type ProjectOption = {
  id: string;
  name: string;
};

export type ProjectSnapshot = {
  tasks: ProjectTask[];
  projects: ProjectOption[];
};

export type ClientStatus = 'lead' | 'active' | 'paused';

export type ClientRecord = {
  id: string;
  name: string;
  organization: string;
  email: string;
  phone: string;
  status: ClientStatus;
  notes: string;
  createdAt: string;
};

export type ClientsSnapshot = {
  clients: ClientRecord[];
  canManage: boolean;
};

export type InboxType = 'info' | 'success' | 'warning' | 'error';

export type InboxItem = {
  id: string;
  title: string;
  message: string;
  type: InboxType;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const columnIds = new Set<string>(taskColumns.map((column) => column.id));
const priorities = new Set<string>(['low', 'medium', 'high', 'urgent']);
const clientStatuses = new Set<string>(['lead', 'active', 'paused']);
const inboxTypes = new Set<string>(['info', 'success', 'warning', 'error']);
const priorityRank: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function asTaskColumn(value: unknown): TaskColumn {
  return typeof value === 'string' && columnIds.has(value) ? (value as TaskColumn) : 'todo';
}

export function asPriority(value: unknown): TaskPriority {
  return typeof value === 'string' && priorities.has(value) ? (value as TaskPriority) : 'medium';
}

export function asClientStatus(value: unknown): ClientStatus {
  return typeof value === 'string' && clientStatuses.has(value) ? (value as ClientStatus) : 'active';
}

export function asInboxType(value: unknown): InboxType {
  return typeof value === 'string' && inboxTypes.has(value) ? (value as InboxType) : 'info';
}

function clip(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function parseClientDirectory(value: unknown): ClientRecord[] {
  if (!Array.isArray(value)) return [];
  const records: ClientRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' && isUuid(row.id) ? row.id : '';
    const name = clip(row.name, 120);
    if (!id || !name) continue;
    records.push({
      id,
      name,
      organization: clip(row.organization, 160),
      email: clip(row.email, 255),
      phone: clip(row.phone, 40),
      status: asClientStatus(row.status),
      notes: clip(row.notes, 2000),
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
    });
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isPastDue(task: Pick<ProjectTask, 'dueDate' | 'status'>, now = Date.now()) {
  if (!task.dueDate || task.status === 'completed') return false;
  const time = new Date(task.dueDate).getTime();
  return Number.isFinite(time) && time < now;
}

export function filterProjectTasks(tasks: ProjectTask[], projectId: string, query: string) {
  const needle = query.trim().toLowerCase();
  return tasks
    .filter((task) => {
      const inProject =
        projectId === 'all' ||
        (projectId === 'none' ? task.departmentId === null : task.departmentId === projectId);
      if (!inProject) return false;
      if (!needle) return true;
      const haystack = `${task.title} ${task.description ?? ''} ${task.assigneeName ?? ''} ${task.departmentName}`.toLowerCase();
      return haystack.includes(needle);
    })
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt.localeCompare(a.createdAt));
}

export function filterClients(clients: ClientRecord[], status: 'all' | ClientStatus, query: string) {
  const needle = query.trim().toLowerCase();
  return clients.filter((client) => {
    if (status !== 'all' && client.status !== status) return false;
    if (!needle) return true;
    return `${client.name} ${client.organization} ${client.email} ${client.phone}`.toLowerCase().includes(needle);
  });
}

export function filterInbox(
  items: InboxItem[],
  scope: 'all' | 'unread' | 'read',
  type: 'all' | InboxType,
) {
  return items.filter((item) => {
    if (scope === 'unread' && item.read) return false;
    if (scope === 'read' && !item.read) return false;
    if (type !== 'all' && item.type !== type) return false;
    return true;
  });
}

export function safeInternalPath(link: string | null) {
  if (!link || !link.startsWith('/') || link.startsWith('//')) return null;
  return link;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${formatDate(value)}, ${hours}:${minutes} UTC`;
}

export function initials(name: string | null) {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}
