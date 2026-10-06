/**
 * Every `@action` method ends in `Action`, so every mutation is visible where it's called
 * (`board.setFilterAction(…)`), and rules about actions can match on the name alone.
 */
export default {
  meta: {
    type: "suggestion",
    schema: [],
    messages: { name: "@action '{{name}}' must end with 'Action'." },
  },
  create(context) {
    const check = (node) => {
      if (node.key.type !== "Identifier" || node.key.name.endsWith("Action")) return;
      for (const { expression } of node.decorators ?? []) {
        const callee = expression.type === "CallExpression" ? expression.callee : expression;
        const name = callee.type === "MemberExpression" ? callee.object.name : callee.name; // @action, @action.bound
        if (name === "action") context.report({ node: node.key, messageId: "name", data: { name: node.key.name } });
      }
    };
    return { MethodDefinition: check, PropertyDefinition: check };
  },
};
