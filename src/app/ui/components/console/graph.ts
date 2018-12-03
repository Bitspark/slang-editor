import m, {CVnode} from "mithril";
import {Output, ConsoleValueType} from "../console";
import {TypeIdentifier} from "../../../custom/type";

export const GraphValueType: ConsoleValueType<[{ x: number, y: number }]> = {
	typeDef: {
		type: TypeIdentifier.Stream,
		stream: {
			type: TypeIdentifier.Map,
			map: {
				name: {type: TypeIdentifier.String},
				data: {
					type: TypeIdentifier.Stream,
					stream: {
						type: TypeIdentifier.Map,
						map: {
							x: {type: TypeIdentifier.Primitive},
							y: {type: TypeIdentifier.Primitive},
						}
					}
				}
			}
		}
	},

	output: {
		view({attrs}: CVnode<Output.ValueTypeAttrs<[{ x: number, y: number }]>>) {
			return m(".sl-graph", attrs.value
				.map(({x, y}: { x: number, y: number }) => m(".sl-graph-xy", JSON.stringify([x, y])))
			);
		}
	}
};
