export type HelpCategory = {
  id: string;
  title: string;
  description: string;
};

export type HelpBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'callout'; title: string; text: string };

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  updated: string;
  blocks: HelpBlock[];
};

export const helpCategories: HelpCategory[] = [
  {
    id: 'start',
    title: 'Getting started',
    description: 'Create a company, sign in, and read the setup checklist.',
  },
  {
    id: 'people',
    title: 'People',
    description: 'Roles, teams, and invitations inside one company.',
  },
  {
    id: 'work',
    title: 'Work',
    description: 'Modules, tasks, and the company data region.',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Geofence clock-in, and the mobile app that comes later.',
  },
];

export const helpArticles: HelpArticle[] = [
  {
    slug: 'start-a-company',
    title: 'Start a company',
    summary: 'Signup creates the tenant and its first admin. Everyone else joins that company later.',
    categoryId: 'start',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'Open Start a company and enter the company name, your name, email, and password. Pick an industry. The industry sets labels and which modules start enabled. Choose a data region: South Africa (za), EU (eu), or multi.',
      },
      {
        kind: 'p',
        text: 'The new company is its own tenant. Tasks, people, and settings stay inside it. You are the first user, with the admin role. There is no second company attached to that login until you are invited into one.',
      },
      {
        kind: 'callout',
        title: 'What signup does not do',
        text: 'It does not send email, open a mobile app, or turn on payments. Those stay off until a provider is connected.',
      },
      {
        kind: 'h',
        text: 'After signup',
      },
      {
        kind: 'ul',
        items: [
          'Sign in on the customer login with the same email.',
          'If that email belongs to more than one company, pick the company slug.',
          'Open the setup checklist and work through team, staff, modules, and geofence.',
        ],
      },
    ],
  },
  {
    slug: 'customer-sign-in',
    title: 'Sign in as a customer',
    summary: 'Customers use a separate login from the operator gate. The session is a bearer token in an httpOnly cookie.',
    categoryId: 'start',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'Customer sign-in is the entrance for people who run a company: admins, managers, and floor staff on the web. The other entrance, /login, is the development operator gate. It is not the customer product, and it is off when the app runs in production.',
      },
      {
        kind: 'h',
        text: 'Two companies, one email',
      },
      {
        kind: 'p',
        text: 'The same email can exist in more than one company. When the password matches more than one, the form asks you to choose the company. The slug is the short name stored on the company, not a display nickname you invent at sign-in.',
      },
      {
        kind: 'callout',
        title: 'Session',
        text: 'A successful sign-in stores a bearer token in an httpOnly cookie. The server checks that token against api_tokens. The browser does not enforce a second set of permissions.',
      },
    ],
  },
  {
    slug: 'setup-checklist',
    title: 'Read the setup checklist',
    summary: 'The checklist at /customer/onboarding counts rows already stored for this company. It does not add a table.',
    categoryId: 'start',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'Signed-in customers open the setup checklist from the customer console. Five items are listed. Four of them flip to done when the database already has the matching rows. The fifth, mobile, stays open.',
      },
      {
        kind: 'ul',
        items: [
          'Create a team — at least one row in teams for this company. A department by itself does not count.',
          'Invite staff — any invitation, or more than one user. The first admin alone leaves this open.',
          'Enable modules — at least one company module with is_enabled set.',
          'Set a geofence — at least one geofence with active set.',
          'Connect mobile later — always open. No table stores a paired phone.',
        ],
      },
      {
        kind: 'callout',
        title: 'A different checklist',
        text: 'The module screen at /customer/module/onboarding reads company, industry, region, modules, people, and a first task. The setup page in this article is the five-step list above. They answer different questions.',
      },
    ],
  },
  {
    slug: 'admin-manager-user',
    title: 'Admin, manager, and user',
    summary: 'Three roles are enforced. A ten-level department tree can be stored. Full visibility rules are not finished.',
    categoryId: 'people',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'Every person in a company has one role: admin, manager, or user. The first account from signup is an admin.',
      },
      {
        kind: 'ul',
        items: [
          'Admin — company settings, module switches, geofence, and invites, including another admin.',
          'Manager — invites (except a new admin), departments, shifts, and travel days.',
          'User — own tasks and own clock-in. Floor staff do not assign work to other people.',
        ],
      },
      {
        kind: 'p',
        text: 'Departments can be nested. The product aim is about ten levels, where higher levels see lower-level work and lower levels see only their own. That visibility middleware is not finished. Do not treat the current lists as a completed hierarchy.',
      },
    ],
  },
  {
    slug: 'invite-staff',
    title: 'Invite staff',
    summary: 'Managers and admins create an invite link. Email is not connected, so the link has to be copied by hand.',
    categoryId: 'people',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'On Staff, create an invite with an email and a role. The server stores a hashed token and a pending invitation that expires in seven days. The response includes a path such as /invite/… . Send that path yourself. The product does not send mail.',
      },
      {
        kind: 'p',
        text: 'The invited person opens the link, sets a password and name, and becomes a user in this company only. Accepting the invite marks the invitation accepted. A second person, or any invitation row, completes the setup checklist step.',
      },
      {
        kind: 'callout',
        title: 'Who can invite',
        text: 'Managers can invite a manager or a user. Only an admin can invite another admin. Floor staff cannot invite.',
      },
    ],
  },
  {
    slug: 'create-a-team',
    title: 'Create a team',
    summary: 'Teams are a separate table from departments. The setup checklist is done when this company has a team row.',
    categoryId: 'people',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'A team belongs to one company. It can point at a department and a manager. People join through team members. Departments are the tree of areas. Teams are the named groups the checklist counts.',
      },
      {
        kind: 'p',
        text: 'The staff screen creates departments and invitations. It does not insert a team. Until a team row exists for the company, the setup checklist keeps “Create a team” open. Adding a department does not close it.',
      },
      {
        kind: 'ul',
        items: [
          'The row must use this company’s id.',
          'The name is required.',
          'A department link is optional.',
        ],
      },
    ],
  },
  {
    slug: 'enable-modules',
    title: 'Turn modules on',
    summary: 'Optional modules stay off unless this company enables them. Industry defaults can switch some on at signup.',
    categoryId: 'work',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'Modules are a catalogue: tasks, staff, scheduling, attendance, and later areas such as wallet, POS, and CCTV. A company module row with is_enabled set means that area is on for this tenant. Admins change switches on the Modules page. The server rejects work in an area that is off.',
      },
      {
        kind: 'p',
        text: 'The setup checklist only asks that one module be on. It does not require a particular name. Signup may already have enabled the industry defaults, in which case the step is done before you open the page.',
      },
      {
        kind: 'callout',
        title: 'Stubs stay stubs',
        text: 'Turning on wallet, POS, CCTV, or mini-apps does not move money, open a camera stream, or connect a partner. Those providers are not wired.',
      },
    ],
  },
  {
    slug: 'tasks-and-deadlines',
    title: 'Assign tasks',
    summary: 'Managers assign work downward. Floor staff keep tasks on their own list. Proof photos and video are not built.',
    categoryId: 'work',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'Tasks need the tasks module. A task has a title, an optional description, a priority, a due date, and someone it is assigned to. Status starts as todo.',
      },
      {
        kind: 'ul',
        items: [
          'Admins and managers can assign a task to someone else in the same company.',
          'A user can create a task only for themselves.',
          'Users see tasks they were assigned or that they created. Managers see the company list.',
        ],
      },
      {
        kind: 'p',
        text: 'Comments, photo proof, and video proof are not stored yet. Checklists on a task are not stored yet. A notification row is written for the assignee only when the notifications module is on. Email and push are not sent.',
      },
    ],
  },
  {
    slug: 'company-region',
    title: 'Choose a data region',
    summary: 'Each company stores za, eu, or multi. That choice is not a promise of a separate deployment region.',
    categoryId: 'work',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'The region is picked at signup and can be changed by an admin in company settings. The allowed values are za, eu, and multi. Anything else is rejected.',
      },
      {
        kind: 'p',
        text: 'This is a per-company setting on the company row. A single hosting region for the whole deployment is still an open decision. Changing the setting does not move existing rows to another database.',
      },
    ],
  },
  {
    slug: 'set-a-geofence',
    title: 'Set a geofence',
    summary: 'An admin saves one active fence. Clock-in uses that centre and radius when the attendance module is on.',
    categoryId: 'attendance',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'On Attendance, save a geofence with a name, latitude, longitude, and radius in metres. The radius has to be greater than zero. The row is stored active. The setup checklist counts active fences for this company only.',
      },
      {
        kind: 'h',
        text: 'Clock-in',
      },
      {
        kind: 'p',
        text: 'Clock-in needs the geofence attendance module and device coordinates. The server allows the punch inside the radius, on a travel shift, or on a travel day a manager already saved. A punch outside the fence with neither exception is refused and written to the audit log. Map tiles are not loaded. Coordinates are the device numbers you send.',
      },
      {
        kind: 'callout',
        title: 'Who can save the fence',
        text: 'Only an admin can set the company geofence. Managers can pre-approve a travel day. Floor staff can attempt clock-in.',
      },
    ],
  },
  {
    slug: 'connect-mobile',
    title: 'Connect mobile later',
    summary: 'iOS and Android are not scaffolded. The setup checklist leaves this step open on purpose.',
    categoryId: 'attendance',
    updated: '30 Oct 2026',
    blocks: [
      {
        kind: 'p',
        text: 'The web app is the control plane. A future mobile client is meant to call the same /api/v1 routes with Authorization: Bearer. No iOS or Android project is in this repo, and the mobile toolkit is still an open decision.',
      },
      {
        kind: 'p',
        text: 'Customer sign-in already issues an API token. That token is the web session. The token table has no column for a phone, an app version, or a device id, so the checklist cannot treat a web login as a connected mobile app.',
      },
      {
        kind: 'ul',
        items: [
          'Officials keep using the customer web for the full console.',
          'Frontline mobile is the later client, not a second set of rules.',
          'The step stays on “Later” until a real client is stored.',
        ],
      },
    ],
  },
];

const articlesBySlug = new Map(helpArticles.map((article) => [article.slug, article]));

export function getHelpCategory(id: string) {
  return helpCategories.find((category) => category.id === id) ?? null;
}

export function getHelpArticle(slug: string) {
  return articlesBySlug.get(slug) ?? null;
}

export function articlePlainText(article: HelpArticle) {
  return article.blocks
    .flatMap((block) => {
      if (block.kind === 'ul') return block.items;
      if (block.kind === 'callout') return [block.title, block.text];
      return [block.text];
    })
    .join(' ');
}

export function articleReadingMinutes(article: HelpArticle) {
  const words = articlePlainText(article).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export type HelpListItem = {
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  categoryTitle: string;
  updated: string;
  minutes: number;
  haystack: string;
};

export function helpListItems(): HelpListItem[] {
  return helpArticles.map((article) => {
    const category = getHelpCategory(article.categoryId);
    const categoryTitle = category?.title ?? article.categoryId;
    const minutes = articleReadingMinutes(article);
    const haystack = [article.title, article.summary, categoryTitle, articlePlainText(article)]
      .join(' ')
      .toLowerCase();
    return {
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      categoryId: article.categoryId,
      categoryTitle,
      updated: article.updated,
      minutes,
      haystack,
    };
  });
}

export function relatedArticles(slug: string, limit = 3) {
  const article = getHelpArticle(slug);
  if (!article) return [];
  return helpArticles.filter((item) => item.categoryId === article.categoryId && item.slug !== slug).slice(0, limit);
}
