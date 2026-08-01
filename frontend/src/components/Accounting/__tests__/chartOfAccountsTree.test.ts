import { describe, expect, it } from "vitest";
import { buildAccountTree, filterAccountTree, flattenAccountTree } from "../chartOfAccountsTree";

type Account = {
  _id: string;
  parentId: string | null;
  code: string;
  name: string;
};

const accounts: Account[] = [
  { _id: "cash", parentId: "assets", code: "1100", name: "Cash & Bank" },
  { _id: "main-cash", parentId: "cash", code: "1101", name: "Main Cash Box" },
  { _id: "assets", parentId: null, code: "1000", name: "Assets" },
  { _id: "liabilities", parentId: null, code: "2000", name: "Liabilities" },
];

describe("Chart of Accounts tree", () => {
  it("nests children under their parents in code order", () => {
    const tree = buildAccountTree(accounts);

    expect(tree.map((node) => node.account._id)).toEqual(["assets", "liabilities"]);
    expect(tree[0].children[0].account._id).toBe("cash");
    expect(tree[0].children[0].children[0].account._id).toBe("main-cash");
    expect(flattenAccountTree(tree, new Set()).map((account) => [account._id, account.treeDepth])).toEqual([
      ["assets", 0],
      ["cash", 1],
      ["main-cash", 2],
      ["liabilities", 0],
    ]);
  });

  it("keeps ancestors visible when a child matches search", () => {
    const tree = buildAccountTree(accounts);
    const filtered = filterAccountTree(tree, (account) => account.name.toLowerCase().includes("main cash"));
    const visible = flattenAccountTree(filtered, new Set(["assets", "cash"]), true);

    expect(visible.map((account) => account.name)).toEqual(["Assets", "Cash & Bank", "Main Cash Box"]);
    expect(visible.every((account) => !account.treeHasChildren || account.treeExpanded)).toBe(true);
  });
});
