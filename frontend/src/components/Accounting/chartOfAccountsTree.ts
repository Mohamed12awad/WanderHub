export interface AccountTreeItem {
  _id: string;
  parentId: string | null;
  code: string;
  name: string;
}

export interface AccountTreeNode<T extends AccountTreeItem> {
  account: T;
  children: AccountTreeNode<T>[];
}

export type FlatAccountTreeItem<T extends AccountTreeItem> = T & {
  treeDepth: number;
  treeHasChildren: boolean;
  treeExpanded: boolean;
};

/** Build a code-sorted forest while treating missing, self, and cyclic parents as roots. */
export function buildAccountTree<T extends AccountTreeItem>(accounts: T[]): AccountTreeNode<T>[] {
  const nodes = new Map<string, AccountTreeNode<T>>(
    accounts.map((account) => [account._id, { account, children: [] }]),
  );
  const roots: AccountTreeNode<T>[] = [];

  const wouldCreateCycle = (account: T, parent: AccountTreeNode<T>) => {
    const visited = new Set([account._id]);
    let current: AccountTreeNode<T> | undefined = parent;
    while (current) {
      if (visited.has(current.account._id)) return true;
      visited.add(current.account._id);
      current = current.account.parentId ? nodes.get(current.account.parentId) : undefined;
    }
    return false;
  };

  for (const account of accounts) {
    const node = nodes.get(account._id)!;
    const parent = account.parentId ? nodes.get(account.parentId) : undefined;
    if (parent && !wouldCreateCycle(account, parent)) parent.children.push(node);
    else roots.push(node);
  }

  const sortByCode = (items: AccountTreeNode<T>[]) => {
    items.sort((left, right) => left.account.code.localeCompare(right.account.code, undefined, { numeric: true }));
    items.forEach((item) => sortByCode(item.children));
  };
  sortByCode(roots);
  return roots;
}

/** Keep matching accounts plus their ancestor path. */
export function filterAccountTree<T extends AccountTreeItem>(
  nodes: AccountTreeNode<T>[],
  matches: (account: T) => boolean,
): AccountTreeNode<T>[] {
  return nodes.flatMap((node) => {
    const children = filterAccountTree(node.children, matches);
    return matches(node.account) || children.length > 0 ? [{ ...node, children }] : [];
  });
}

export function flattenAccountTree<T extends AccountTreeItem>(
  nodes: AccountTreeNode<T>[],
  collapsedIds: ReadonlySet<string>,
  forceExpanded = false,
  depth = 0,
): FlatAccountTreeItem<T>[] {
  return nodes.flatMap((node) => {
    const treeHasChildren = node.children.length > 0;
    const treeExpanded = treeHasChildren && (forceExpanded || !collapsedIds.has(node.account._id));
    const current = {
      ...node.account,
      treeDepth: depth,
      treeHasChildren,
      treeExpanded,
    } as FlatAccountTreeItem<T>;
    return treeExpanded
      ? [current, ...flattenAccountTree(node.children, collapsedIds, forceExpanded, depth + 1)]
      : [current];
  });
}
