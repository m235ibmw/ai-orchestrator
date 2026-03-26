import fetch from 'node-fetch';

const NOTION_VERSION = '2022-06-28';

type Workspace = 'personal' | 'work';

function getNotionToken(workspace: Workspace = 'personal'): string {
  const key =
    workspace === 'work'
      ? process.env.NOTION_API_KEY_WORK
      : process.env.NOTION_API_KEY_PERSONAL;
  if (!key) {
    throw new Error(
      `Missing env var: NOTION_API_KEY_${workspace === 'work' ? 'WORK' : 'PERSONAL'}`,
    );
  }
  return key;
}

async function notionFetch(
  endpoint: string,
  options: { method?: string; body?: unknown } = {},
  workspace: Workspace = 'personal',
): Promise<unknown> {
  const token = getNotionToken(workspace);
  const url = `https://api.notion.com${endpoint}`;
  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    ...(options.body !== undefined && {
      body: JSON.stringify(options.body),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status}: ${text}`);
  }
  return res.json();
}

// --------------------------
// Exported functions
// --------------------------

export async function search(
  query: string,
  filter?: { property: 'object'; value: 'page' | 'database' },
  workspace?: string,
) {
  try {
    const body: Record<string, unknown> = { query };
    if (filter) body.filter = filter;
    const result = await notionFetch(
      '/v1/search',
      { method: 'POST', body },
      (workspace as Workspace) ?? 'personal',
    );
    return { success: true, ...(result as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function queryDatabase(
  databaseId: string,
  filter?: object,
  sorts?: unknown[],
  startCursor?: string,
  pageSize?: number,
  workspace?: string,
) {
  try {
    const body: Record<string, unknown> = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (startCursor) body.start_cursor = startCursor;
    if (pageSize) body.page_size = pageSize;
    const result = await notionFetch(
      `/v1/databases/${databaseId}/query`,
      { method: 'POST', body },
      (workspace as Workspace) ?? 'personal',
    );
    return { success: true, ...(result as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getPage(pageId: string, workspace?: string) {
  try {
    const result = await notionFetch(
      `/v1/pages/${pageId}`,
      {},
      (workspace as Workspace) ?? 'personal',
    );
    return { success: true, ...(result as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getBlockChildren(
  blockId: string,
  startCursor?: string,
  pageSize?: number,
  workspace?: string,
) {
  try {
    const params = new URLSearchParams();
    if (startCursor) params.set('start_cursor', startCursor);
    if (pageSize) params.set('page_size', String(pageSize));
    const qs = params.toString();
    const result = await notionFetch(
      `/v1/blocks/${blockId}/children${qs ? `?${qs}` : ''}`,
      {},
      (workspace as Workspace) ?? 'personal',
    );
    return { success: true, ...(result as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createPage(
  parent: object,
  properties: object,
  children?: unknown[],
  workspace?: string,
) {
  try {
    const body: Record<string, unknown> = { parent, properties };
    if (children) body.children = children;
    const result = await notionFetch(
      '/v1/pages',
      { method: 'POST', body },
      (workspace as Workspace) ?? 'personal',
    );
    return { success: true, ...(result as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updatePage(
  pageId: string,
  properties: object,
  workspace?: string,
) {
  try {
    const result = await notionFetch(
      `/v1/pages/${pageId}`,
      { method: 'PATCH', body: { properties } },
      (workspace as Workspace) ?? 'personal',
    );
    return { success: true, ...(result as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function appendBlocks(
  blockId: string,
  children: unknown[],
  workspace?: string,
) {
  try {
    const result = await notionFetch(
      `/v1/blocks/${blockId}/children`,
      { method: 'PATCH', body: { children } },
      (workspace as Workspace) ?? 'personal',
    );
    return { success: true, ...(result as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
