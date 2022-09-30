import m, {ClassComponent} from "mithril";
import {SlangType} from "../../../slang/definitions/type";

export namespace Output {
	export interface ValueTypeAttrs<T> {
		value: T;
		type: SlangType;
	}

	export abstract class ValueType<T> implements ClassComponent<ValueTypeAttrs<T>> {
		public oncreate?(_vnode: m.CVnodeDOM<ValueTypeAttrs<T>>): any {
			return;
		}

		public onupdate?(_vnode: m.CVnodeDOM<ValueTypeAttrs<T>>): any {
			return;
		}

		public abstract view(vnode: m.CVnode<ValueTypeAttrs<T>>): m.Children | void | null;
	}

	/*
	export class ConsoleEntry implements ClassComponent<{ value: any, type: SlangType }> {

		public view({attrs}: CVnode<{ value: any, type: SlangType }>) {
			return this.getOutputComponent(attrs.value, attrs.type);
		}

		private getOutputComponent(value: any, type: SlangType): any {
			const typeSpecificComp = ConsoleValueTypeManager.findOutput(type);
			if (typeSpecificComp) {
				return m(typeSpecificComp, {value, type});
			}

			switch (type.getTypeIdentifier()) {
				case TypeIdentifier.Map: {
					return m(".sl-json", Array.from(type.getMapSubs())
						.map(([subName, subType]) => [
							m(".sl-json-pair",
								{class: (subType.isPrimitive()) ? "sl-json-prim-val" : "sl-json-nested-val"},
								m(".sl-json-key", subName),
								m(".sl-json-val", this.getOutputComponent(value[subName], subType)),
							),
						]));
				}
				case TypeIdentifier.Stream: {
					const subType = type.getStreamSub();
					return m(".sl-json", value.map((val: any, i: number) => [
						m(".sl-json-pair",
							{class: (subType.isPrimitive()) ? "sl-json-prim-val" : "sl-json-nested-val"},
							m(".sl-json-key", i),
							m(".sl-json-val", this.getOutputComponent(val, subType)),
						),
					]));
				}
				default: {
					return JSON.stringify(value);
				}
			}
		}
	}
	*/
}
