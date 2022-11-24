//import m, {ClassComponent, CVnode} from "mithril";
export {Input} from "./input";
export {Output} from "./output";
export {ConsoleValueTypeManager} from "./manager"

//import {debounceTime} from "rxjs/operators";

//import {BOS, PortModel} from "../../../slang/core/abstract/port";
//import {BlueprintModel} from "../../../slang/core/models";
//import {SlangType, SlangTypeJson,} from "../../../slang/definitions/type";


/*
interface InputConsoleAttrs {
	type: SlangType;

	onsubmit(value: SlangTypeValue): void;
}

export class InputConsole implements ClassComponent<InputConsoleAttrs> {
	private type: SlangType | undefined;
	private value: SlangTypeValue | undefined;

	public oninit({attrs}: CVnode<InputConsoleAttrs>) {
		this.type = attrs.type;
	}

	public view({attrs}: CVnode<InputConsoleAttrs>): any {
		const that = this;
		return m("form.sl-console-in", {
				class: (that.isValid() ? "sl-invalid" : ""),
			},
			this.renderInput(this.type!, undefined),
			m(Button, {
				full: true,
				notAllowed: !that.isValid(),
				onClick:
                    that.isValid()
                    ? () => {
                        attrs.onsubmit(that.value!);
                    }
                    : undefined,
			}, ""),
		);
	}

	private isValid(): boolean {
		return this.value !== undefined;
	}

	private renderInput(type: SlangType, initValue: SlangTypeValue | undefined): m.Children {
		return m(Input.ConsoleEntry, {
			initValue,
			type: type!,
            // XXX obsolete, rename to lower case
			onInput: (v: any) => {
				this.value = v;
			},
		});
	}
}
interface OutputConsoleAttrs {
	model: OutputConsoleModel;
}

export class OutputConsoleModel {
	constructor(private readonly blueprint: BlueprintModel) {
		const dueTime = 500;
		this.blueprint.getPortOut()!.getDescendantPorts().forEach((port) => {
			port.dataReceived.pipe(debounceTime(dueTime)).subscribe(() => {
				m.redraw();
			});
		});
	}

	public get port(): PortModel {
		return this.blueprint.getPortOut()!;
	}

	public list(): IterableIterator<PortModel> {
		return this.blueprint.getPortOut()!.getDescendantPorts().values();
	}
}
*/

/*
class Json implements ClassComponent<any> {
	public view({children}: CVnode<any>): m.Children {
		return m(".json", [
			m("", "{"),
			m(".json-wrapped", children),
			m("", "}"),
		]);
	}
}

class JsonProp implements ClassComponent<any> {
	public view({attrs, children}: CVnode<{ prop: string }>): m.Children {
		return m(".json-prop", [
			m(".json-prop-key", attrs.prop + ":"),
			m(".json-prop-val", children),
		]);
	}
}

export class OutputConsole implements ClassComponent<OutputConsoleAttrs> {
	private static render(port: PortModel): m.Children {
		switch (port.getTypeIdentifier()) {
			case TypeIdentifier.Map: {
				return m(Json, Array.from(port.getMapSubs())
					.map((subPort: any) => [
						m(JsonProp, {prop: subPort.getName()}, OutputConsole.render(subPort)),
					]));
			}
			case TypeIdentifier.Stream: {
				const subPort = port.getStreamSub();
				return OutputConsole.render(subPort);
			}
			default: {
				return m("span", [
					port.readData().map((d) => {
						if (d.isMarker()) {
							return d === BOS ? "[" : "]";
						}
						return JSON.stringify(d.value) + " ";
					}),
					port.isOpenStream() ? m("button.is-loading") : undefined,
				]);
			}
		}
	}

	private model!: OutputConsoleModel;

	public oninit({attrs}: CVnode<OutputConsoleAttrs>) {
		this.model = attrs.model;
	}

	public view(): m.Children {
		return m(List, m(Json, OutputConsole.render(this.model.port)));
	}
}
*/

/*
ConsoleValueTypeManager.register(BINARY_VALUE_TYPE);
ConsoleValueTypeManager.register(FILE_VALUE_TYPE);
ConsoleValueTypeManager.register(IMAGE_VALUE_TYPE);
ConsoleValueTypeManager.register(GRAPH_VALUE_TYPE);
*/