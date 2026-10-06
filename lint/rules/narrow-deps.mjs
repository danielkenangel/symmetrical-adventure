/**
 * Constructors take the narrow pieces they use, never the composition root or a container.
 * This is the rule that keeps an "app state controller" from forming: a model that receives the
 * whole app can reach everything, so its dependencies are invisible and cycles cost nothing.
 *
 * Options: { forbidden: string[] } — type names a constructor parameter may not have.
 */
export default {
  meta: {
    type: "problem",
    schema: [{ type: "object", properties: { forbidden: { type: "array", items: { type: "string" } } }, additionalProperties: false }],
    messages: { wide: "Constructors take the dependencies they use, not '{{type}}'. Pass a deps object of narrow pieces." },
  },
  create(context) {
    const forbidden = new Set(context.options[0]?.forbidden ?? ["AppRoot"]);
    const typeNames = (annotation) => {
      if (!annotation) return [];
      if (annotation.type === "TSTypeReference" && annotation.typeName.type === "Identifier") return [annotation.typeName.name];
      if (annotation.type === "TSUnionType") return annotation.types.flatMap(typeNames);
      if (annotation.type === "TSTypeLiteral") {
        return annotation.members.flatMap((member) => typeNames(member.typeAnnotation?.typeAnnotation));
      }
      return [];
    };
    return {
      'MethodDefinition[kind="constructor"]'(node) {
        for (const param of node.value.params) {
          const target = param.type === "TSParameterProperty" ? param.parameter : param;
          for (const name of typeNames(target.typeAnnotation?.typeAnnotation)) {
            if (forbidden.has(name)) context.report({ node: param, messageId: "wide", data: { type: name } });
          }
        }
      },
    };
  },
};
