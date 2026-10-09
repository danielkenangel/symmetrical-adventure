/**
 * Constructors and feature factories (`createX(deps)`) take the features they use, never the
 * composition root or a container. A model that receives the whole app can reach everything, so its
 * dependencies are invisible and cycles cost nothing. This rule is what keeps that from forming.
 *
 * It checks the parameter's type, the members of inline deps types, and the members of interfaces
 * and type aliases declared in the same file (the usual `interface FooDeps`).
 *
 * It also rejects hidden back-edges: a deps member that's a function returning a value
 * (`limits: () => billing.limits`) lets a dependency be read after construction, which is how a
 * runtime cycle gets in. Callbacks that return nothing (`setTitle: (title) => void`) are fine.
 *
 * Options: { forbidden: string[] }
 */
export default {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: { forbidden: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: {
      wide: "Take the features you use, not '{{type}}'. Pass a deps object, e.g. { boards, navigation }.",
      thunk: "'{{name}}' is a function that returns a value: a hidden back-edge. Depend on the value itself.",
    },
  },
  create(context) {
    const forbidden = new Set(context.options[0]?.forbidden ?? []);
    const local = new Map(); // name → interface or type alias declared in this file

    const membersOf = (members, seen) => members.flatMap((member) => typeNames(member.typeAnnotation?.typeAnnotation, seen));
    // Every type name an annotation can reach: references and their type arguments (Pick<Session, …>),
    // local interfaces (members and `extends`) and aliases, unions, function results, arrays.
    // `seen` stops recursion through self-referencing types.
    function typeNames(annotation, seen) {
      if (!annotation) return [];
      switch (annotation.type) {
        case "TSTypeReference": {
          const args = (annotation.typeArguments ?? annotation.typeParameters)?.params ?? [];
          const fromArgs = args.flatMap((arg) => typeNames(arg, seen));
          if (annotation.typeName.type !== "Identifier") return fromArgs;
          const name = annotation.typeName.name;
          const declaration = local.get(name);
          if (!declaration || seen.has(name)) return [name, ...fromArgs];
          seen.add(name);
          return [name, ...fromArgs, ...typesOfDeclaration(declaration, seen)];
        }
        case "TSUnionType":
        case "TSIntersectionType":
          return annotation.types.flatMap((type) => typeNames(type, seen));
        case "TSTypeLiteral":
          return membersOf(annotation.members, seen);
        case "TSFunctionType":
          return typeNames(annotation.returnType?.typeAnnotation, seen);
        case "TSArrayType":
          return typeNames(annotation.elementType, seen);
        case "TSTypeOperator":
          return typeNames(annotation.typeAnnotation, seen);
        default:
          return [];
      }
    }
    function typesOfDeclaration(declaration, seen) {
      if (declaration.type === "TSTypeAliasDeclaration") return typeNames(declaration.typeAnnotation, seen);
      const inherited = (declaration.extends ?? []).flatMap((heritage) =>
        heritage.expression.type === "Identifier"
          ? typeNames(
              { type: "TSTypeReference", typeName: heritage.expression, typeArguments: heritage.typeArguments ?? heritage.typeParameters },
              seen,
            )
          : [],
      );
      return [...inherited, ...membersOf(declaration.body.body, seen)];
    }

    // The deps object's own members (not nested ones), for the back-edge check.
    function topMembers(annotation, seen = new Set()) {
      if (!annotation) return [];
      if (annotation.type === "TSTypeLiteral") return annotation.members;
      if (annotation.type === "TSIntersectionType") return annotation.types.flatMap((type) => topMembers(type, seen));
      if (annotation.type !== "TSTypeReference" || annotation.typeName.type !== "Identifier") return [];
      const declaration = local.get(annotation.typeName.name);
      if (!declaration || seen.has(declaration)) return [];
      seen.add(declaration);
      if (declaration.type === "TSTypeAliasDeclaration") return topMembers(declaration.typeAnnotation, seen);
      const inherited = (declaration.extends ?? []).flatMap((heritage) =>
        heritage.expression.type === "Identifier" ? topMembers({ type: "TSTypeReference", typeName: heritage.expression }, seen) : [],
      );
      return [...inherited, ...declaration.body.body];
    }

    function checkParam(param) {
      const target = param.type === "TSParameterProperty" ? param.parameter : param;
      const annotation = target.typeAnnotation?.typeAnnotation;
      for (const name of new Set(typeNames(annotation, new Set()))) {
        if (forbidden.has(name)) context.report({ node: param, messageId: "wide", data: { type: name } });
      }
      for (const member of topMembers(annotation)) {
        const type = member.typeAnnotation?.typeAnnotation;
        const name = member.key?.name ?? "dependency";
        if (type?.type === "TSFunctionType" && type.returnType?.typeAnnotation?.type !== "TSVoidKeyword") {
          context.report({ node: member, messageId: "thunk", data: { name } });
        }
      }
    }

    const params = [];
    return {
      "TSInterfaceDeclaration, TSTypeAliasDeclaration"(node) {
        local.set(node.id.name, node);
      },
      'MethodDefinition[kind="constructor"]'(node) {
        params.push(...node.value.params);
      },
      "FunctionDeclaration[id.name=/^create[A-Z]/]"(node) {
        params.push(...node.params);
      },
      // Checked at the end, so interfaces declared after the class are known too.
      "Program:exit"() {
        for (const param of params) checkParam(param);
      },
    };
  },
};
