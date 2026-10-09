/**
 * A hook's name says where its value comes from: one that reads the query cache ends in `Query`, one
 * that reads the mutation cache ends in `Mutation`. Reading through another such hook counts, so the
 * suffix carries up through hooks that build on one another. Components are not checked.
 */
const QUERY = /^use(Query|Queries|SuspenseQuery|SuspenseQueries|InfiniteQuery|SuspenseInfiniteQuery|IsFetching)$|^use\w+Query$/;
const MUTATION = /^use(Mutation|MutationState|IsMutating)$|^use\w+Mutation$/;

function hookName(fn) {
  if (fn.type === "FunctionDeclaration") return fn.id?.name;
  const parent = fn.parent;
  if (parent.type === "VariableDeclarator" && parent.id.type === "Identifier") return parent.id.name;
  return undefined;
}

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      query: "'{{name}}' reads the query cache (via {{callee}}), so name it '{{name}}Query'.",
      mutation: "'{{name}}' reads the mutation cache (via {{callee}}), so name it '{{name}}Mutation'.",
    },
  },
  create(context) {
    return {
      "CallExpression[callee.type='Identifier']"(node) {
        const callee = node.callee.name;
        const kind = QUERY.test(callee) ? "query" : MUTATION.test(callee) ? "mutation" : null;
        if (!kind) return;
        const fn = context.sourceCode.getAncestors(node).findLast((n) => n.type.includes("Function"));
        const name = fn && hookName(fn);
        if (!name || !/^use[A-Z]/.test(name)) return;
        if (!name.endsWith(kind === "query" ? "Query" : "Mutation")) context.report({ node, messageId: kind, data: { name, callee } });
      },
    };
  },
};
